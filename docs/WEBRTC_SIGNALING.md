# WebRTC Signaling

Peer-to-peer video calling between recruiter and candidate via Socket.IO signaling.

---

## Overview

WebRTC provides direct peer-to-peer video/audio communication. The backend acts as a signaling server — it forwards SDP offers, answers, and ICE candidates between peers via Socket.IO. No media streams pass through the server.

---

## Connection Lifecycle

```
┌─────────────┐                                    ┌─────────────┐
│  Candidate   │                                    │  Recruiter   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  1. join-interview (interviewId)                 │
       │  ──────────────────────────────────────────────► │
       │                                                  │
       │  2. peer-joined { userId, userName, role }       │
       │  ◄────────────────────────────────────────────── │
       │                                                  │
       │  3. createOffer() → setLocalDescription()        │
       │                                                  │
       │  4. webrtc-offer { interviewId, offer }          │
       │  ──────────────────────────────────────────────► │
       │                                                  │
       │                              5. setRemoteDescription(offer)
       │                              6. createAnswer() → setLocalDescription()
       │                                                  │
       │  7. webrtc-answer { interviewId, answer }        │
       │  ◄────────────────────────────────────────────── │
       │                                                  │
       │  8. setRemoteDescription(answer)                 │
       │                                                  │
       │  9. ICE Candidate Exchange (bidirectional)       │
       │  ◄──────────────────────────────────────────────► │
       │                                                  │
       │  10. P2P Connection Established                  │
       │  ◄──────────────────────────────────────────────► │
       │          Video/Audio streams directly             │
       │                                                  │
```

---

## Signaling Messages

### webrtc-offer

**Direction**: Initiator → Receiver

**Payload**:
```typescript
{
  interviewId: string,
  offer: RTCSessionDescriptionInit  // SDP offer
}
```

**Server Action**: Broadcasts to other users in the interview room.

---

### webrtc-answer

**Direction**: Receiver → Initiator

**Payload**:
```typescript
{
  interviewId: string,
  answer: RTCSessionDescriptionInit  // SDP answer
}
```

**Server Action**: Broadcasts to other users in the interview room.

---

### webrtc-ice-candidate

**Direction**: Both peers → Server → Other peer

**Payload**:
```typescript
{
  interviewId: string,
  candidate: RTCIceCandidateInit  // ICE candidate
}
```

**Server Action**: Broadcasts to other users in the interview room.

---

## ICE Configuration

```typescript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

**STUN servers** are used for NAT traversal — they help peers discover their public IP addresses for direct connection.

---

## Stream Management

### Local Stream
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
```

- Stored in `localStreamSignal` (Angular signal)
- Added to `RTCPeerConnection` via `addTrack()`
- Displayed in local `<video>` element

### Remote Stream
```typescript
pc.ontrack = (event) => {
  remoteStream.addTrack(event.track);
  remoteStreamSignal.set(remoteStream);
};
```

- Received from peer via `ontrack` callback
- Stored in `remoteStreamSignal` (Angular signal)
- Displayed in remote `<video>` element

---

## Reconnection Handling

When a peer disconnects:
```
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'disconnected' || 'failed') {
    remoteStreamSignal.set(null);  // Clear remote video
  }
};
```

When a peer leaves:
```
socket.on('peer-left', (data) => {
  remoteStreamSignal.set(null);
  peerConnection.close();
  peerConnection = null;
  iceCandidatesQueue = [];
});
```

---

## Cleanup

When leaving the interview room:
```
1. Stop all local stream tracks
2. Close RTCPeerConnection
3. Clear ICE candidates queue
4. Set signals to null
5. Remove participant entries
```

```typescript
localStream?.getTracks().forEach(track => track.stop());
peerConnection?.close();
remoteStreamSignal.set(null);
participants.set([]);
```
