$(function() {
	var
		socket = io('http://localhost'),
		config, updateTimeout, 
		$timeline = $('section.timeline');
		$timelineTemplate = $timeline.find('.template').removeClass('template').detach();

	function rescheduleUpdate() {
		console.log('(re)scheduling update in', config.interval, 'ms');
		clearTimeout(updateTimeout);
		updateTimeout = setTimeout(triggerUpdate, config.interval);
	}

	function triggerUpdate() {
		socket.emit('triggerUpdate');
	}

	socket.on('update', function (data) {
		console.log('received data', data);
		config = data.config

		console.log('filling content panels');
		fillTimelinePanel(
			data.rooms[config.room]
		);
		
		/*
		fillRoomsPanel(
			data.rooms
		);

		console.log('switching to inital panel');
		switchToInitialPanel();
		*/

		rescheduleUpdate();
	});

	function fillTimelinePanel(timeline) {
		var
			$tr = $('<tr/>'),
			now = Date.now();

		for (var i = 0; i < timeline.length; i++) {
			var
				item = timeline[i],
				$td = $timelineTemplate
					.clone()
					.appendTo($tr)
					.find('.title')
						.text(item.title)
					.end()
					.css('width', item.duration*10)
					.attr({
						'data-start': item.start,
						'data-end': item.end
					})
		};

		// swap display content
		$timeline.find('tr').replaceWith($tr);

		setInterval(updateTimelineScroll, 2000);
		updateTimelineScroll();
	}

	function updateTimelineScroll() {
		var
			$tds = $timeline.find('td'),
			current, offset, now = Date.now() - config.time_offset;

		console.log('time is now', new Date(now));
		$tds.each(function(idx) {
			current = $tds[idx-1];

			if($(this).data('start') > now)
				return false; // break loop
		});

		if(current)
		{
			var $current = $(current);
			offset = $current.position().left + $timeline.scrollLeft();

			if($current.data('end') > now)
			{
				// $current is not past
				offset -= ( ($current.data('start') - now) / 1000 / 60 * 10);
			}

			$timeline.scrollLeft(parseInt(offset) - 100)
		}
	}

	function fillRoomsPanel(rooms) {

	}

	function switchToInitialPanel() {

	}
});
