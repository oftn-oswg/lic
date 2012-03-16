The Architecture of lic
=======================

Definitions
-----------

<dl>
  <dt>Hub</dt>
    <dd>A process which runs in the background, houses the lic API, and responds to the petals API calls, and processes events</dd>
  <dt>Petal</dt>
    <dd>A script that runs either in the hub or a seperate process and uses the lic API</dd>
  <dt>Item</dt>
    <dd>A channel for events</dd>
  <dt>Scene</dt>
    <dd>A group of Items defined by the user</dd>
</dl>

Chat networks
-------------

Each chat network will be implemented in a petal. For example, a petal will implement the IRC protocol and create Items related to IRC. For example `irc/irc.freenode.net/#oftn` would receive PRIVMSG events every so often. It's up to UI petals to decide what they can display. When a petal is going to register to receive events, an IRC petal for example would listen only for `irc/*`.

Communication protocol
----------------------

The communication protocol is flexible and should work over a normal socket. TLS should also be supported as an option to the user. It should also be able to work over different things like WebSockets and any arbitrary Readable/Writable Stream.

Events
------

Item events require at least three things:

1. A unique event ID for easy referencing
2. An associated Item (allow events to belong to more than one Item?)
3. An event type that makes sense in the context of the chat protocol (privmsg, notice, message, mode change, etc). This should be generic if possible, but doesn't necessarily have to be - just choose a logical name.

Events will optionally have a `data` property giving extra details if necessary.

Event listeners
---------------

![Diagram of the flow of events](https://github.com/oftn/lic/raw/master/img/petals.png)

The purple petals are ones that connect to the chat network. The pink petals are once that register listeners with the hub and can modify the events that the purple ones send. Petals are ordered in a tree structure by the user. Events flow from the hub to the registered petals.

We'll start with an example of a message being sent in an IRC channel. The message is registered as an event and sent from the IRC petal to the hub. The hub takes the message and knows it has to send it to listening petals. When the tree of listeners branches, the event is split and becomes separate from the other. Simultaneously, the event is sent to each of the branches.

In this case, the event is copied and sent to "Logging", "Auto CTCP Reply", and "Ignore darkf user". What happens next is up the petals. They can choose to possibly modify the event and propogate it, or do nothing. The event object can be modified and then sent to the next petal(s) in line with the event's next() method. The "ignore darkf user" petal only propogates if the message was not sent from the "darkf" user. Say it decides to propogate the message. The hub will then copy the event, and simultaneously send it to the "Web interface" and the "Terminal interface" petal. These petals are responsible for providing the user with a UI to view the messages. Of course, UI petals are entirely optional. lic is easily usable as an extensible bot or bot framework.

Items
-----

Think of Items as an event channel. Display petals would render these events as messages on the screen however they like.

Items are named with a special addressing scheme. For IRC, it would be `irc/<server-name>/<channel>`. Wildcards are allowed, for example `irc/*` which will represent more than one Item.

Scene
-----

Think of Scenes as a group of Items and Scenes that the user wants to associate together. In the config, they can be listed as a comma separated list of items, and allow wildcards. Scenes are defined in the `lic/scene/*` namespace and can be treated as items in the description of a scene. This way you can have scenes-of-scenes. Recursive structures are *not* allowed.

