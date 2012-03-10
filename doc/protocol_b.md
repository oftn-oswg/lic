Russell Frank
Devin Samarin
Created January 5, 2012

    Notice: These docs were written January 5th, 2012 and are considered outdated. They are here as a reference for development.

# The lic Hub-to-Petal Protocol

This document is currently a rough draft documenting the communication protocol used between the hub and petals of the  ಠ_ಠ Internet Relay Chat client.


## Overview

The hub and petals will communicate through a socket defined in the ಠ_ಠ configuration file. The default location for this file is ~/.diaptoval/config.json. The socket may be a normal UNIX socket, or a TCP socket allowing petals to communicate over the network. We view the socket as a message-passing architecture.  Messages are newline separated JSON objects. Each message will have at least two fields, type, which indicates the type of the message, and time, which is a timestamp with second precision representing the time the message was first emitted.

## Objects

Objects represent different aspects of the client. Each object will have associated actions that can be performed on them. They are also represented by a hidden numeric identifier used in the protocol. Plug-ins may create objects of their own. Some examples of objects are:


 * Hub: Represents the currently running Hub
 * Config: Represents saved configuration settings
 * IRCManager: Manages list of open IRCConnection objects
 * IRCConnection: Represents a connection to an IRC server
 * Scene: A named group of Item objects
 * Item: A channel or information window
 * ItemManager: Manages created Scene and Item objects
 * Scrollback: Represents the text that passed through an Item
 * Script: A running script on the Hub

