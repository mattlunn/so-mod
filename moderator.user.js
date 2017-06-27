// ==UserScript==
// @name         Helpful Moderator Userscripts
// @namespace    https://github.com/mattlunn/so-mod
// @version      1.14
// @author       Matt
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.stackexchange.com/*
// @exclude     *://blog.stackoverflow.com/*
// @exclude     *://chat.stackexchange.com/*
// @exclude     *://chat.stackoverflow.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// ==/UserScript==
/* jshint -W097 */
(function () {
	'use strict';

	if (!StackExchange.options.user.isModerator) {
		return;
	}

	var Settings = (function () {
		var key = 'mattlunn-moderator-settings';
		var master = null;

		function Settings(settings, remote) {
			this.settings = settings;
			this.remote = remote;

			switch (settings.version) {
				case undefined:
					this.settings.preferences = {
						decline_reasons: [
							'we do not delete questions once they have accrued answers, as the posted solutions may prove helpful to future visitors',
							'please use the standard close reasons to close questions, rather than the \'requires moderator attention\' flags'
						],
						message_templates: [{
							name: 'creating accounts to bypass question ban',
							message: 'Please stop creating new accounts to circumvent your question ban. Instead, read the following advise and edit your *existing* content to bring it inline with the site\'s guidelines.\n\nhttp://stackoverflow.com/help/question-bans\n\nI have deleted the additional accounts you created. Do not create any more.'
						}],
					};
				case 2:
					this.settings.preferences.review_ban_message_from_profile = 'A number of your recent reviews have been incorrect. Please pay more attention to each review in the future';
					this.settings.preferences.review_ban_message_from_review = 'You reviewed {{review}} incorrectly. Please pay more attention to each review in future';
				case 3:
					this.settings.preferences.annotation_for_comment = 'Left the following comment on {{post}}: "{{comment}}"'
					this.settings.preferences.show_cm_count_on_profile = true;
					this.settings.preferences.highlight_cm_contacts_on_profile = true;
				case 4:
					this.settings.preferences.must_click_esc_to_close_popups = true;
				case 5:
					this.settings.preferences.add_reputation_to_flag_page = true;
				case 6:
					delete this.settings.preferences.show_cm_count_on_profile;
					delete this.settings.preferences.highlight_cm_contacts_on_profile;
			}

			this.settings.version = 7;
			this.version = '1.14';
		}

		Settings.prototype.save = function () {
			localStorage.setItem(key, JSON.stringify({
				settings: this.settings,
				remote: this.remote
			}));

			if (this.remote) {
				return jQuery.post(this.remote, JSON.stringify(this.settings));
			}

			return jQuery.Deferred().resolve().promise();
		};

		Settings.init = function () {
			if (!master) {
				var settings;

				master = jQuery.Deferred();

				try {
					settings = JSON.parse(localStorage.getItem(key));
				} catch (e) {}

				if (!settings) {
					master.resolve(new Settings(Settings.defaults, null));
				} else if (!settings.remote) {
					master.resolve(new Settings(settings.settings, null));
				} else {
					jQuery.getJSON(settings.remote).done(function (data) {
						master.resolve(new Settings(data, settings.remote));
					}).fail(function (xhr, reason) {
						master.reject(reason, new Settings(Settings.defaults, settings.remote));
					});
				}
			}

			return master.promise();
		};

		Settings.parse = function (json) {
			return json.replace(/: *"((?:.|\s)+?[^\\])"/g, function (match, str) {
				return ':"' + str.replace(/\n/g, "\\n") + '"';
			});
		};

		Settings.format = function (obj) {
			return JSON.stringify(obj, null, 4).replace(/: *"(.+?[^\\])"/g, function (match, str) {
				return ':"' + str.replace(/\\n/g, "\n") + '"';
			});
		};

		Settings.defaults = new Settings({}, null).settings;

		return Settings;
	}());

	var helpers = {
		idFromUrl: function (url) {
			return url.match(/\/users\/(-?\d+)\//)[1];
		},

		// http://stackoverflow.com/a/13371349/444991
		escapeHtml: function (text) {
			return text.replace(/[\"&<>]/g, function (a) {
				return { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[a];
			});
		},

		format: function (str, replacements) {
			for (var x in replacements) {
				if (replacements.hasOwnProperty(x)) {
					str = str.replace(new RegExp('{{' + x + '}}', 'g'), replacements[x]);
				}
			}

			return str;
		},

		thousands: function (value) {
			var rgx = /(\d+)(\d{3})/;
			value = value.toString();

			while (rgx.test(value)) {
				value = value.replace(rgx, '$1,$2');
			}

			return value;
		}
	};

	(function () {
		function initManageLink(err, settings) {
			jQuery(document).ready(function ($) {
				$('<a href="#">manage SO-mod userscript ' + (err ? '<span style="color:red">could not load settings (' + err + ')</span>' : '') + '</a>').on('click', function (e) {
					e.preventDefault();
					
					$('#content').loadPopup({
						html: [
							'<div class="popup no-further-action-popup">',
								'<div class="popup-close"><a title="close this popup (or hit Esc)">&times;</a></div><h2><a href="http://github.com/mattlunn/so-mod" target="_blank">SO-mod Userscript Settings</a> (v' + settings.version + '):</h2>',
								'<textarea rows="30" style="width: 900px; font-family: \'Courier New\'; margin-bottom: 10px;"></textarea><br />',
								'<button name="save">save and reload</button> <a href="#" class="reset">defaults</a>',
								'<span style="float: right;">Remote (<a href="#" class="generate">generate</a>):&nbsp;&nbsp;&nbsp;<input type="text" style="width: 300px; padding: 5px; margin: 0;" name="remote" /><button style="margin: -3px 0 0 5px" name="set">set</button></span>',
							'</div>'
						].join('')
					}).then(function (popup) {
						var textarea = popup.find('textarea').val(Settings.format(settings.settings.preferences));

						if (settings.remote !== null) {
							popup.find('[name="remote"]').val(settings.remote).data('remote', settings.remote);
						}

						popup.find('button[name="save"]').on('click', function (e) {
							var spinner = $('<span style="color: orange"> saving...</span>');
							var json = Settings.parse(textarea.val());

							try {
								settings.settings.preferences = JSON.parse(json);
							} catch (e) {
								return alert('Settings is not valid JSON.');
							}

							spinner.insertAfter(this);

							settings.remote = popup.find('[name="remote"]').data('remote');
							settings.save().then(function () {
								spinner.css('color', 'green').text(' saved');
								window.location.reload();
							}).fail(function () {
								spinner.css('color', 'red').text(' error').delay(5000).fadeOut('slow', function () {
									$(this).remove();
								});
							});
						});

						popup.find('a.reset').on('click', function (e) {
							textarea.val(Settings.format(Settings.defaults.preferences));
							e.preventDefault();
						});

						popup.find('a.generate').on('click', function (e) {
							var remote = $('[name="remote"]');
							e.preventDefault();

							if (remote.val().length && !confirm('Are you sure you wish to replace the existing remote URL with a new one?')) {
								return false;
							}

							// http://stackoverflow.com/a/2117523/444991
							remote.val(window.location.protocol + '//sandbox.mattlunn.me.uk/userscript/?id=' + ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
								var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
								return v.toString(16);
							})));
						});

						popup.find('button[name="set"]').on('click', function (e) {
							var remote = $('[name="remote"]');
							var remoteVal = jQuery.trim(remote.val());

							if (remoteVal.length) {
								jQuery.get(remoteVal).done(function (val) {
									if (Object.keys(val).length && confirm('Click "OK" to replace your local settings with those found remotely (don\'t forget to click "save" as well). Clicking "Cancel" will allow you to overwrite the remote settings with your local ones by clicking "save"')) {
										textarea.val(Settings.format(new Settings(val, remoteVal).settings.preferences));
									} else {
										alert('Click "save" to push your settings to the remote URL you specified');
									}

									remote.data('remote', remoteVal);
								}).fail(function () {
									alert('Could not retrieve settings from the remote URL you specified.');
								});
							} else {
								remote.data('remote', null);
							}
						});
					});
				}).appendTo('#svnrev').before('&nbsp;|&nbsp;');
			});
		}

		Settings.init().done(function (settings) {
			initManageLink(null, settings);
		}).fail(function (error, defaults) {
			initManageLink(error, defaults);
		});
	}());

	Settings.init().done(function (settings) {
		$(document).ajaxSend(function (e, xhr, options) {
			if (options.url.startsWith('/admin/dismiss-flag')) {
				options.dataFilter = function (data, type) {
					var html = $('<div />').html(data);

					html.find('li').last().before(settings.settings.preferences.decline_reasons.map(function (item) {
						return [
							'<li style="width: 380px">',
								'<label><input name="dismiss_Options" type="radio" value="' + helpers.escapeHtml(item) + '" style="float: left"><span class="action-desc">' + helpers.escapeHtml(item) + '</span></label>',
							'</li>'
						].join('');
					}).join(''));
					
					return html.html();
				};
 
				xhr.done(function () {
					setTimeout(function () {
						$('div.popup').center();
					});
				});
			}
		});
	});

	Settings.init().done(function (settings) {
		function createAnnotation(comment, post) {
			var annotation = helpers.format(settings.settings.preferences.annotation_for_comment, {
				post: post,
				comment: comment
			});

			return annotation.length > 300 ? helpers.format(settings.settings.preferences.annotation_for_comment, {
				post: post,
				comment: comment.slice(0, 300 - 3 - annotation.length) + '...'
			}) : annotation;
		}

		if (settings.settings.preferences.annotation_for_comment) {
			$(document).on('click', 'a.js-add-link.comments-link', function (e) {
				var target = $('#' + $(this).closest('div').prop('id').replace(/comments-link/, 'add-comment'));

				setTimeout(function () {
					target.find('input[type="submit"][value="Add Comment"]').next('br').replaceWith('<label style="margin-left: 3px; display: block"><input type="checkbox" style="display: inline" class="annotate"/> annotate?');
					target.on('submit', function (e) {
						if (target.find('input.annotate').prop('checked')) {
							var self = $(this);
							var postParent = self.closest('.answer,.question');
							var opId = helpers.idFromUrl(postParent.find('table.fw td.post-signature:last div.user-details a').prop('href'));

							jQuery.post('/admin/users/' + opId + '/annotate', {
								annotation: createAnnotation(self.find('textarea[name="comment"]').val(), postParent.find('a.short-link').prop('href')),
								fkey: StackExchange.options.user.fkey
							}).fail(function () {
								alert('Could not add an annotation to the users profile. Sorry.');
							});
						}
					});
				}, 1)
			});
		}
	});

	Settings.init().done(function (settings) {
		$(document).ajaxSend(function (e, xhr, options) {
			if (options.url.startsWith('/admin/contact-user/template-popup/')) {
				var toUserUrl = $('#addressing tr').filter(function () {
					return jQuery.trim($(this).find('td:first-child').text()) === 'to';
				}).find('.user-details a').prop('href');

				if (!toUserUrl) {
					return;
				}

				options.dataFilter = function (data, type) {
					var html = $('<div />').html(data);

					html.find('ul').append(settings.settings.preferences.message_templates.map(function (item, i) {
						var message = 'Hello,\n\nI&#39;m writing in reference to your Stack Overflow account:\n\n' + toUserUrl + '\n\n' + item.message + '\n\nRegards  \n' + StackExchange.options.site.name  + ' Moderation Team';

						return [
							'<li>',
								'<input type="radio" id="template-custom-' + i + '" name="mod-template" value="' + message + '"/>',
								'<input type="hidden" id="template-custom-' + i + '-reason" value="for rule violations" />',
								'<label for="template-custom-' + i + '" class="template-custom"><span class="action-name"> ' + item.name + '</span><span class="action-desc"> ' + item.message + '</span></label>',
							'</li>'
						].join('');
					}).join(''));
					
					return html.html();
				};
			}
		});
	});

	if (/^(\/review|\/documentation\/review)\//.test(window.location.pathname)) {
		Settings.init().done(function (settings) {
			function addBanningOptionsToReviewers() {
				$('span.mattlunn-ban-toggler-container').remove();

				$('.review-results a').each(function () {
					var self = $(this);
					var id = helpers.idFromUrl(self.prop('href'));
					var name = jQuery.trim(self.text());

					jQuery.get(this.href).done(function (html) {
						var banLink = $(html).find('.user-panel-mod-info a:contains(prior review bans)').text(function () {
							return $(this).text().trim().replace(/^\(|\)$/g, '')
						});
						var isBlocked = banLink.length === 0;
						var span = $('<span class="mattlunn-ban-toggler-container"> (</span>').insertAfter(self);
						var a = $('<a href="#" data-user-id="' + id + '" data-user-name="' + name + '" data-message="' + helpers.escapeHtml(helpers.format(settings.settings.preferences.review_ban_message_from_review, {
							review: window.location.href
						})) + '"></a>').appendTo(span);

						if (isBlocked) {
							self.css('color', 'red');
							a.addClass('mattlunn-unban-user').text('unban');
							span.append(')');
						} else {
							a.addClass('mattlunn-ban-user').text('ban');
							span.append(' - ').append(banLink).append(')');
						}
					});
				});
			}

			// See #2.
			if (typeof settings.settings.preferences.review_ban_message_from_review === 'string') {
				$(document).ajaxSuccess(function (e, xhr, options) {
					if (options.url.startsWith('/review/next-task')) {
						xhr.done(function () {
							addBanningOptionsToReviewers();	
						});
					}
				});

				if ($('.review-results').length) {
					addBanningOptionsToReviewers();
				}
			}
		});
	}

	Settings.init().done(function (settings) {
		if (typeof settings.settings.preferences.review_ban_message_from_profile === 'string') {
			$('div.user-panel-mod-info td:contains(blocked from reviews)').next('td').each(function () {
				var self = $(this);
				var name = jQuery.trim($('.name').text());
				var id = helpers.idFromUrl(location.href);
				var isBlocked = !self.find('.blocked-no').length;

				self.append('(<a href="#" data-user-id="' + id + '" data-user-name="' + name + '" '
					+ 'data-message="' + helpers.escapeHtml(settings.settings.preferences.review_ban_message_from_profile) + '" '
					+ 'class="mattlunn-' + (isBlocked ? 'unban' : 'ban') + '-user">'
					+ (isBlocked ? 'unban' : 'ban') + '</a>)');
			});
		}
	});

	Settings.init().done(function (settings) {
		if (settings.settings.preferences.must_click_esc_to_close_popups) {
			$(document).on('popupClosing', function (e) {
				if (e.closeTrigger === 'click outside') {
					e.preventDefault();
				}
			});
		}
	});

	Settings.init().done(function (settings) {
		if (settings.settings.preferences.add_reputation_to_flag_page && window.location.pathname === '/admin/dashboard') {
			var map = {};

			$('.flag-row a[href^="/users/"]').each(function () {
				var id;

				try {
					id = helpers.idFromUrl($(this).prop('href'));
				} catch (e) {
					return;
				}

				map[id] = map[id] || [];
				map[id].push(this);
			});

			jQuery.get('https://api.stackexchange.com/2.2/users/' + Object.keys(map).join(';') + '?order=desc&sort=reputation&site=' + window.location.hostname + '&pagesize=100&filter=!*MxJcsZ)vC2RZAFo').done(function (response) {
				for (var i=0;i<response.items.length;i++) {
					$(map[response.items[i].user_id]).after('<span style="color: #848d95"> (' + helpers.thousands(response.items[i].reputation) + ')</span>');
				}
			});
		}
	});

	(function () {
		function toggleState(a) {
			a.toggleClass('mattlunn-unban-user mattlunn-ban-user').text(function (i, curr) {
			   return curr === 'unban' ? 'ban' : 'unban';
			}).siblings('a').css('color', a.hasClass('mattlunn-ban-user') ? '' : 'red');
		}

		$(document).on('click', 'a.mattlunn-ban-user', function (e) {
			var self = $(this);

			self.loadPopup({
				html: [
					'<div class="popup no-further-action-popup">',
						'<form>',
							'<div class="popup-close"><a title="close this popup (or hit Esc)">&times;</a></div><h2></h2>',
							'<input type="hidden" name="fkey" value="' + StackExchange.options.user.fkey + '" />',
							'<input type="hidden" name="userId" value="' + self.data('user-id') + '" />',
							'<input type="hidden" name="reviewBanChoice" value="days-other" />',
							'<textarea rows="4" style="width: 450px" name="explanation">' + helpers.escapeHtml(self.data('message')) + '</textarea><br class="clear-both">',
							'ban ' + helpers.escapeHtml(self.data('user-name')) + ' for <input name="reviewBanDays" style="width: 40px" /> days <input type="submit" value="Ban" style="margin-left: 15px;">',
						'</form>',
					'</div>'
				].join('')
			}).then(function (popup) {
				popup.on('submit', 'form', function (e) {
					e.preventDefault();
					
					jQuery.post('/admin/review/ban-user', $(this).serialize()).done(function () {
						popup.find('.popup-close a').trigger('click');
						toggleState(self);
					}).fail(function () {
						alert('Could not ban user... please try again');
					});
				});
			});
			
			e.preventDefault();
		});
		
		$(document).on('click', 'a.mattlunn-unban-user', function (e) {
			var self = $(this);
			
			if (confirm('Are you sure you wish to unban ' + self.data('user-name') + '?')) {
				jQuery.post('/admin/review/unban-user', { 
					userId: self.data('user-id'), 
					fkey: StackExchange.options.user.fkey 
				}).fail(function () {
					alert('Could not ban user... please try again');
				}).done(function () {
					toggleState(self);
				});
			}
			
			e.preventDefault();
		});
	}());
}());
