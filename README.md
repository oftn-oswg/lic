lic
===

`lic` is an IRC client/IRC client framework.

![lic](https://github.com/oftn/lic/raw/master/img/logo.png)

Multiple-client
---------------
A single `lic` hub will remain connected to IRC for you at all times, and you can “attach” multiple
clients to it--called petals--in separate terminals, viewing different channels, queries, or combinations of
channels and queries. You can define ‘windows’ that will retain specific combinations of channels
and queries, and retain scrollback from them for when you return at a later point.

Unbelievably extensible
-----------------------
`lic` is extremly extensible through JavaScript, and provides full functionality to construct as
complex/powerful an interface as you would like. The hub can run scripts that modify your
overall IRC experience, while specific windows (as described above) can be scripted to customize the
experience in ways unique to particular groups of channels and queries.

Most crucially, the entire interface itself is built via the scripting API; and you have full access
to ncurses-level interface-building functionality to implement everything from timestamps, to nickname
hilights, to user lists, to statusbars. You can have an interface as simple as [ii][] or as complex
as [irssi][], entirely through user-built scripts.

   [ii]: <http://tools.suckless.org/ii/> "a minimalist FIFO and filesystem-based IRC client"
   [irssi]: <http://irssi.org/> "themable ncurses IRC client"

Current features
----------------

 * Alternate nick support
 * Message throttling
 * SSL support (10 Mar 2012)

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

    % send ("Say, this lic client is pretty cool!")


IRC Commands
------------

### Manager

Example item: `irc`

- `:shutdown`: Disconnects from all servers and cleans up

### Server

Example item: `irc/freenode`

- `:send("PING :foo")`: Sends raw IRC command to server
- `:send_to("#oftn", "Greetings from lic!")`: Sends a message to a channel or user
- `:join("#oftn")`: Joins the channel specified in the argument
- `:part("#oftn")`: Parts the channel specified in the argument
- `:quit`: Disconnects from the server--quit message argument is optional

### Channel

Example item: `irc/freenode/#oftn`

- `:join`: Another way of joining a channel
- `:part`: Another way of parting a channel
- `:send("Good news, everyone!")`: Another way of sending a message to the channel

### User

Example item: `irc/freenode/eboy`

- `:send("Great job on your IRC client!")`: Another way of sending a message to a user

