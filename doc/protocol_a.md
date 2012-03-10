# The Hub-to-Petal Communications Protocol

Created by:
Devin Samarin

## Format

To facilitate communication between the different processes that make up ಠ_ಠ, messages will be streamed as newline-separated JSON. This is a great choice for many reasons:
The hub and petals are both written in JavaScript using Node.js and can easily parse it.
The newline can be easily located within the stream; this means that no newlines will be permitted in the message text unless it is escaped, which is not a problem. 
There is no three.

## Pattern

Because of the evented nature of instant messaging, each message will represent a single event. Also because of the way a petal will only need to know a subset of all of the possible events at one time, a publish-subscribe pattern will be used.

This means that the event publisher (the hub) does not program the messages to be sent directly to a specific receiver. Each event will be categorized into classes, along with the event metadata, which will be discussed later. The hub does this without knowledge of the attached petals. Next the petal, once loaded, will express its interest in a category of events by subscribing to it and with additional filtering by the requested event metadata.

Because of this method, network traffic will be cut down to only what is required. The petals will only subscribe to events that the user needs. This approach provides greater network scalability and a more dynamic network topology, whatever the hell that means.
Events

We will need to discuss this together if we want ಠ_ಠ to be agnostic to the IRC protocol and support other services like XMPP, Jabber, Your Mom, etc. Nevertheless, each event will have an associated timestamp representing the time the event was dispatched. This will be used for many things.

What I think is very important are message confirmations. That is, once a petal sends a message to the hub, the hub should send back a response to let the petal know that it has been received or processed. Messages may be timestamped or given a unique identifier which can be used in the reply message to help correlate the two. It might be a good idea to do this even for when a petal sends an IRC message. The information returned would be able to be appended or changed with a plug-in, and could offer information like how long the message probably took to get to the server, which would be useful for ordering the channel messages on the screen as received on the server.

## Subscribing

To tell the hub that the petal would like to listen to events, the petal would send the hub something like this:

``{type: “subscribe”, event: “privmsg”, channel: “##hat”}``

The `type` property would be common to all messages in order to easily route the message to the appropriate place. In this case, the petal is sending a “subscribe” message. The event it wants to subscribe to is the “privmsg” event given by the `event` property (this is not finalized, especially if we discuss making ಠ_ಠ work for non-IRC protocols). And lastly, the `channel` property is meta-data which is specific to the “privmsg” event.

The hub will receive this message, and from that point on, all events of the type “privmsg” for the channel “##hat” will be forwarded to that petal. Every time the petal opens a connection to the hub, it will have to resubscribe.

## Scrollback/Logging

In order to save on memory, the hub will save a record of events--in its event form--to a file on the hard drive. This will serve a double-purpose as a log format and as a way to keep track of scrollback.

When a petal decides it wants to access the scrollback from a specific time, it can send the hub a scrollback message with a range to access, by timestamp. The events that the hub sends back will only be for the events that the petal is currently subscribed to. The petal should take care to access a minimal amount of scrollback when it needs at a time. It is likely however that normal events will be kept in the petal’s memory.
