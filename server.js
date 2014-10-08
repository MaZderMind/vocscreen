var
	connect = require('connect'),
	morgan = require('morgan'),
	servestatic = require('serve-static'),
	socketio = require('socket.io'),
	lesscss = require('less-middleware'),
	http = require('http'),
	request = require('request'),
	async = require('async'),
	config = require('./config.js');

console.log('config', config)


http.ServerResponse.prototype.endJson = function(jsondata) {
	this.setHeader("Content-Type", "application/json");
	this.setHeader("Access-Control-Allow-Origin", "*");
	this.end(JSON.stringify(jsondata));
}

var app = connect()
	.use(morgan('dev'))
	.use(lesscss('public'))
	.use(servestatic('public'));

app.use('/rooms.json', function(req, res) {
	fetchAndAggregateData(function(data) {
		res.endJson(data)
	})
});

var server = http
	.createServer(app)
	.listen(config.port);

var sockets = socketio
	.listen(server);

// send initial data on connection
sockets.on('connection', function (socket) {
	console.log('sending initial data on connection')
	sendUpdate(socket);

	// send updates on poll request
	socket.on('triggerUpdate', function() {
		console.log('sending triggered update')
		sendUpdate(socket);
	});
});


function parseDuration(duration) {
	var parts = duration.split(':');
	return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function fetchAndAggregateData(cb) {
	console.log('fetching schedule & engelapi')
	async.parallel({
		'schedule': function(cb) {
			request(config.schedule, cb)
		},
		'engelapi': function(cb) {
			request(config.engelapi, cb)
		}
	}, function(error, res) {
		if(error) {
			console.log('error while fetching data', error.toString());
			return cb(error);
		}

		var
			now = Date.now() - config.time_offset,
			engel = JSON.parse(res.engelapi[1]),
			schedule = JSON.parse(res.schedule[1]).schedule,
			rooms = {};

		console.log('aggregating data')
		schedule.conference.days.forEach(function(day, index) {
			var
				daystart = Date.parse(day.day_start),
				dayend = Date.parse(day.day_end);

			//console.log(day.day_start, start);
			//console.log(day.day_end, end);
			for(roomname in day.rooms) {
				var
					last_stamp = daystart,
					talks = day.rooms[roomname];

				rooms[roomname] = rooms[roomname] || [];
				talks.forEach(function(talk) {
					var
						start = Date.parse(talk.date),
						duration = parseDuration(talk.duration), // in minutes
						end = start + duration*60*1000;

					talk.duration = duration;

					// synthetize pause event
					if(start > last_stamp)
					{
						var
							pausestart = last_stamp,
							pauseend = start,
							duration = Math.round((pauseend - pausestart) / 1000 / 60);

						rooms[roomname].push({
							title: duration+' minutes pause',

							start: pausestart,
							end: pauseend,
							duration: duration,

							is_mechanical: true,
							is_today: (daystart < now && now < dayend),
							is_current: (pausestart < now && now < pauseend),
							is_future: (pausestart > now),
							is_past: (pauseend < now),
						});
					}

					talk.start = start;
					talk.end = end;
					last_stamp = end;

					talk.is_today = (daystart < now && now < dayend);
					talk.is_current = (start < now && now < end);
					talk.is_future = (start > now);
					talk.is_past = (end < now);


					var personnames = [];
					talk.persons.forEach(function(person) {
						personnames.push(person.full_public_name)
					});
					talk.personnames = personnames.join(', ');

					talk.is_taken = false;
					talk.angel = 'lulu';
					talk.angeldect = '3242';

					rooms[roomname].push(talk)
				});

				// synthetize daychange event
				if(index < schedule.conference.days.length - 1 && rooms[roomname].length > 0)
				{
					var
						pausestart = last_stamp,
						pauseend = Date.parse(schedule.conference.days[index+1].day_start);

					rooms[roomname].push({
						title: 'Daychange from day '+index+' to day '+(index+1),

						start: pausestart,
						end: pauseend,
						duration: 120,

						is_mechanical: true,
						is_current: (pausestart < now && now < pauseend),
						is_future: (pausestart > now),
						is_past: (pauseend < now),
					});
				}
			}

		});

		for(roomname in rooms) {
			rooms[roomname].sort(function(a, b) {
				return a.start - b.start;
			});
		}

		cb(rooms);
	});
}

function sendUpdate(target) {
	fetchAndAggregateData(function(rooms) {
		console.log('updating client')
		target.emit('update', {
			'config': config,
			'rooms': rooms
		})
	})
}
