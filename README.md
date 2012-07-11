lic
===

`lic` is an IRC client/IRC client framework.

![lic](https://github.com/oftn/lic/raw/master/img/logo.png)


Unique
------

What's unique about `lic` is that it acts as an IRC bouncer but with a special API that you can access from anywhere.
It is accessible from multiple protocols and can be used to quickly make bots. It comes with an IRC client that's
designed to be extremely extensible through JavaScript, and provides full functionality to construct as
complex/powerful an interface as you would like. You can have an interface as simple as [ii][] or as complex as
[irssi][], entirely through user-built scripts.

   [ii]: <http://tools.suckless.org/ii/> "a minimalist FIFO and filesystem-based IRC client"
   [irssi]: <http://irssi.org/> "themable ncurses IRC client"

Architecture
-----------

The client is made up of a central hub, which will remain connected to IRC for you at all times, and petals which are attachable scripts which have the option of running out-of-process or even across a network. Petals can be anything from a client interface to a bot to a simple tweak.


Current features
----------------

 * Alternate nick support
 * Message throttling
 * SSL support (10 Mar 2012)
 * Nicklist management (8 Jul 2012)

Test Interface
--------------

The test interface is a temporary feature in the lic hub which is used to send commands. The syntax is
`[item:]command[(args, ...)]`. By default `item` is the last item entered.

Let's get started with launching lic with the IRC petal.

    $ ./bin/licd --petal=./petal/irc/IRC.js

Your configuration will be loaded from `~/.lic/config.json`. For an example configuration file, look in
`doc/example-config.json`.

The IRC server should connect automatically if it was listed in your config. Okay, let's join a channel.

    % irc/freenode/#oftn:join

Okay, great. We can see all of the data being sent to and received from the IRC server. The item is optional
if we want to use the same item from the last command.

    % say ("Say, this lic client is pretty cool!")


IRC Commands
------------

### Manager

Example item: `irc`

- `:shutdown`: Disconnects from all servers and cleans up

### Server

Example item: `irc/freenode`

- `:send("PING :foo")`: Sends raw IRC command to server
- `:say("#oftn", "Greetings from lic!")`: Sends a message to a channel or user
- `:join("#oftn")`: Joins the channel specified in the argument
- `:part("#oftn")`: Parts the channel specified in the argument--part message argument is optional
- `:quit`: Disconnects from the server--quit message argument is optional
- `:trace("#oftn")`: (Debugging) Prints nicklist of given channel

### Channel

Example item: `irc/freenode/#oftn`

- `:join`: Another way of joining a channel
- `:part`: Another way of parting a channel
- `:say("Good news, everyone!")`: Another way of sending a message to the channel
- `:trace`: (Debugging) Prints nicklist of channel

### User

Example item: `irc/freenode/eboy`

- `:say("Great job on your IRC client!")`: Another way of sending a message to a user

