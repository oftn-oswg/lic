The IRC Profile Object
======================

The IRC profile object describes everything lic needs to connect to your IRC server and identify. It is a JSON object with a specific set of properties.


Example
-------

    {
        "host": "irc.freenode.net",
        "port": 6667,
        "name": "Freenode",
        "nick": ["eboy", "eboyjr", "eman", "emanjr"],
        "username": "eboyjr",
        "realname": "Devin Samarin",
        "password": "hunter2",
        "quit_message": "The reports of my death have been greatly exaggerated."
    }


Description
-----------

<table>
  <tr>
    <th>Property</th>
    <th>Type</th>
    <th>Description</th>
    <th>Default</th>
  </tr>
  <tr>
    <td>host</td>
    <td>string</td>
    <td>The hostname of the IRC server to connect to</td>
    <td>"localhost"</td>
  </tr>
  <tr>
    <td>port</td>
    <td>number</td>
    <td>The port at which the server is listening to</td>
    <td>6667</td>
  </tr>
  <tr>
    <td>name</td>
    <td>string</td>
    <td>A special name used to identify the connection</td>
    <td>The host property</td>
  </tr>
  <tr>
    <td rowspan="2">nick</td>
    <td>string</td>
    <td>Your IRC nickname</td>
    <td>Guest****</td>
  </tr>
  <tr>
    <td>array of strings</td>
    <td>List of IRC nicknames. If one is not available, the next in line will be used.</td>
    <td>&middot;</td>
  </tr>
  <tr>
    <td>username</td>
    <td>string</td>
    <td>Your IRC username</td>
    <td>"guest"</td>
  </tr>
  <tr>
    <td>realname</td>
    <td>string</td>
    <td>The real name used to identify the user</td>
    <td>"Guest"</td>
  </tr>
  <tr>
    <td>password</td>
    <td>string</td>
    <td>The IRC password, if any</td>
    <td>None</td>
  </tr>
  <tr>
    <td>quit_message</td>
    <td>string</td>
    <td>Message sent to the IRC server when disconnecting</td>
    <td>None</td>
  </tr>
  <tr>
    <td>message_speed</td>
    <td>number</td>
    <td>Time to wait before sending another message in milliseconds</td>
    <td>2200</td>
  </tr>
</table>
