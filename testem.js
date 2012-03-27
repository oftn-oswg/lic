var event_manager = new (require ("./hub/EventManager.js")) ({petals:{}})
  , config        = new (require ("./hub/HubConfig.js"   )) (event_manager)
  ;

config.set ("lic/routes/message_reverser", ["nonexistent1"]);
config.set ("lic/routes/nonexistent1",     ["nonexistent2", "ui"]);

event_manager.subscribe ("ui", "irc/**", "message", function (item, type, data) {
	console.log ("\033[32m <" + item.replace (/^irc\//, "") + ":" + data.sender + "> " + data.body + "\033[0m");
});

event_manager.subscribe ("message_reverser", "irc/**", "message", function (item, type, data) {
	data.body = data.body.split ("").reverse ().join ("");
	event_manager.next ("message_reverser", item, type, data);
});

event_manager.publish ("irc/freenode/#oftn", "message", {sender: "oftn-bot", body: "devyn: Test failed."});
