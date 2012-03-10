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
