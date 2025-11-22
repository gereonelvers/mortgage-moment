import { useState, useRef, useCallback } from 'react';

export function useRealtimeVoice(propertyDetails, userData, onSendEmail, onUpdateProfile, onCheckAffordability) {
    const [status, setStatus] = useState('idle'); // idle, connecting, connected, error
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const pcRef = useRef(null);
    const dcRef = useRef(null);
    const streamRef = useRef(null);

    const toggleMute = useCallback(() => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    const startCall = useCallback(async () => {
        try {
            setStatus('connecting');
            setError(null);

            // 1) Fetch ephemeral token
            const tokenRes = await fetch('/api/realtime-token', { method: 'POST' });
            if (!tokenRes.ok) throw new Error('Failed to get token');
            const { secret } = await tokenRes.json();

            // 2) Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 3) Set up WebRTC
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            // Add local audio tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Handle remote audio
            const audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];
            };

            // Data channel
            const dc = pc.createDataChannel('oai-events');
            dcRef.current = dc;

            dc.onopen = () => {
                setStatus('connected');

                // Format property details for the prompt
                const context = propertyDetails ? `
                    You are "Momo", a helpful mortgage assistant for the "Mortgage Moment" application.
                    
                    You are currently discussing the following property:
Title: ${propertyDetails.title}
Address: ${propertyDetails.address.street}, ${propertyDetails.address.postcode} ${propertyDetails.address.city}
Price: €${propertyDetails.buyingPrice.toLocaleString()}
Rooms: ${propertyDetails.rooms}
Size: ${propertyDetails.squareMeter} sqm
Floor: ${propertyDetails.floor}

                    The user you are talking to has provided the following details:
Name: ${userData?.name || 'Unknown'}
Email: ${userData?.email || 'Unknown'}
                    Monthly Income: €${userData?.income || 'Unknown'}
                    Current Rent: €${userData?.rent || 'Unknown'}
Equity: €${userData?.equity || '0'}
                    Employment Status: ${userData?.employmentStatus || 'Not provided'}
Age: ${userData?.age || 'Not provided'}
                    Monthly Debts: €${userData?.monthlyDebts || 'Not provided'}

                    The user is interested in this property.Your goal is to:
1. Naturally collect missing information(employment, age, debts). Enquire about it proactively.
2. Once you have enough info(at minimum: income, employment, age), use the check_affordability tool to give them a definitive answer
3. Answer their questions about the property


                    Be conversational and helpful. Don\'t bombard them with questions, but still aim to be proactive.
                ` : "You are a helpful mortgage assistant.";

                const instructions = `${context}
IMPORTANT: Please speak ONLY in English.
                    Be excited about helping the user.
                    Introduce yourself like this: "Hi ${userData?.name ? userData.name : 'there'}, I'm Momo, your money-minded mortgage mentor. I see you've picked out a property in ${propertyDetails?.address?.city || 'your area'}. Anything specific I can help with?"
                    
                    ## Tools Available
                    You have three tools:
1. "send_email_summary" - Send a property summary email to the user
2. "update_user_profile" - Update the user's profile with new information they tell you
3. "check_affordability" - Check if the user can afford this property based on their profile
                    
                    Use these tools appropriately based on the conversation.
                `;

                // 1. Update Session with Instructions and Tools
                const sessionUpdate = {
                    type: "session.update",
                    session: {
                        modalities: ["audio", "text"],
                        instructions: instructions,
                        tools: [
                            {
                                type: "function",
                                name: "send_email_summary",
                                description: "Send an email summary of the current property to the user.",
                                parameters: {
                                    type: "object",
                                    properties: {},
                                    required: []
                                }
                            },
                            {
                                type: "function",
                                name: "update_user_profile",
                                description: "Update a field in the user's profile with new information.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        field: {
                                            type: "string",
                                            enum: ["employmentStatus", "age", "monthlyDebts"],
                                            description: "The field to update"
                                        },
                                        value: {
                                            type: "string",
                                            description: "The new value for the field"
                                        }
                                    },
                                    required: ["field", "value"]
                                }
                            },
                            {
                                type: "function",
                                name: "check_affordability",
                                description: "Check if the user can afford this property based on their current profile information.",
                                parameters: {
                                    type: "object",
                                    properties: {},
                                    required: []
                                }
                            }
                        ]
                    }
                };
                dc.send(JSON.stringify(sessionUpdate));

                // 2. Trigger initial response
                const responseCreate = {
                    type: "response.create",
                    response: {
                        modalities: ["audio", "text"],
                    }
                };
                dc.send(JSON.stringify(responseCreate));
            };

            dc.onclose = () => setStatus('idle');

            dc.onmessage = async (e) => {
                const event = JSON.parse(e.data);

                // Handle Function Calling
                if (event.type === 'response.function_call_arguments.done') {
                    const { call_id, name, arguments: args } = event;

                    if (name === 'send_email_summary') {
                        console.log('AI requested to send email summary');

                        // Execute the function
                        const success = await onSendEmail();

                        // Send output back to model
                        const functionOutput = {
                            type: "conversation.item.create",
                            item: {
                                type: "function_call_output",
                                call_id: call_id,
                                output: JSON.stringify({ success: success, message: success ? "Email sent successfully" : "Failed to send email" })
                            }
                        };
                        dc.send(JSON.stringify(functionOutput));

                        // Trigger response to acknowledge
                        const responseCreate = {
                            type: "response.create"
                        };
                        dc.send(JSON.stringify(responseCreate));
                    }
                    else if (name === 'update_user_profile') {
                        console.log('AI requested to update user profile:', args);

                        try {
                            const parsedArgs = JSON.parse(args);
                            const success = onUpdateProfile(parsedArgs.field, parsedArgs.value);

                            const functionOutput = {
                                type: "conversation.item.create",
                                item: {
                                    type: "function_call_output",
                                    call_id: call_id,
                                    output: JSON.stringify({
                                        success: success,
                                        message: `Updated ${parsedArgs.field} to ${parsedArgs.value}`
                                    })
                                }
                            };
                            dc.send(JSON.stringify(functionOutput));

                            const responseCreate = {
                                type: "response.create"
                            };
                            dc.send(JSON.stringify(responseCreate));
                        } catch (error) {
                            console.error('Error parsing args:', error);
                        }
                    }
                    else if (name === 'check_affordability') {
                        console.log('AI requested affordability check');

                        const result = await onCheckAffordability();

                        const functionOutput = {
                            type: "conversation.item.create",
                            item: {
                                type: "function_call_output",
                                call_id: call_id,
                                output: JSON.stringify(result)
                            }
                        };
                        dc.send(JSON.stringify(functionOutput));

                        const responseCreate = {
                            type: "response.create"
                        };
                        dc.send(JSON.stringify(responseCreate));
                    }
                }
            };

            // 4) Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 5) Send SDP to OpenAI
            const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${secret}`,
                    'Content-Type': 'application/sdp',
                },
            });
            if (!sdpRes.ok) throw new Error('Failed to send SDP');

            const answerSdp = await sdpRes.text();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

        } catch (err) {
            console.error('Error starting call:', err);
            setError(err.message);
            setStatus('error');
        }
    }, [propertyDetails, userData, onSendEmail]);

    const stopCall = useCallback(() => {
        if (pcRef.current) pcRef.current.close();
        if (dcRef.current) dcRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setStatus('idle');
        setIsMuted(false);
    }, []);

    return { startCall, stopCall, status, error, isMuted, toggleMute };
}
