var
	os = require("os"),
	host = os.hostname();

exports.port = 5000;
exports.schedule = 'http://localhost/~peter/schedule.json';
exports.engelapi = 'http://localhost/~peter/engel.json';
exports.interval = /*5 * */60 * 1000;

exports.time_offset = (Date.now() - Date.parse('2014-09-06T15:30:00+02:00'));

if(host == 'spock')
	exports.room = 'Grossbaustelle BER';

else if(host == 'display1')
	exports.room = 'Grossbaustelle BER';

else if(host == 'display2')
	exports.room = 'Tiefbaustelle S21';
