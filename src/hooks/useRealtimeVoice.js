import { useState, useRef, useCallback } from 'react';

export function useRealtimeVoice(propertyDetails, userData, onSendEmail) {
    const [status, setStatus] = useState('idle'); // idle, connecting, connected, error
    const [error, setError] = useState(null);
    const pcRef = useRef(null);
    const dcRef = useRef(null);
    const streamRef = useRef(null);

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
                    You are a "Momo", a helpful mortgage assistant for the "Mortgage Moment" application.
                    
                    You are currently discussing the following property:
Title: ${propertyDetails.title}
Address: ${propertyDetails.address.street}, ${propertyDetails.address.postcode} ${propertyDetails.address.city}
Price: €${propertyDetails.buyingPrice.toLocaleString()}
Rooms: ${propertyDetails.rooms}
Size: ${propertyDetails.squareMeter} sqm
Floor: ${propertyDetails.floor}

                    The user you are talking to provided the following details:
Name: ${userData?.name || 'Unknown'}
Email: ${userData?.email || 'Unknown'}
                    Monthly Income: €${userData?.income || 'Unknown'}
                    Current Rent: €${userData?.rent || 'Unknown'}
Equity: €${userData?.equity || '0'}

                    The user is interested in this property.Do not suggest other properties but help them answer their questions about this one.
                ` : "You are a helpful mortgage assistant.";

                const instructions = `${context}
IMPORTANT: Please speak ONLY in English.
                    Be excited about helping the user.
                    Introduce yourself like this: "Hi ${userData?.name ? userData.name : 'there'}, I'm Momo, your money-minded mortgage mentor. I see you've picked out a property in ${propertyDetails?.address?.city || 'your area'}. Anything specific I can help with?"
                    
                    ## Tools
                    You have a tool called "send_email_summary".
                    If the user asks for a summary or more information to be sent to them, use this tool.
                    After calling the tool, tell the user that you have sent the email.
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
    }, []);

    return { startCall, stopCall, status, error };
}
