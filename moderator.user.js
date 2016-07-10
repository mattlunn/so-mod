// ==UserScript==
// @name         Helpful Moderator Userscripts
// @namespace    https://github.com/mattlunn/so-mod
// @version      1.9
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
			}

			this.settings.version = 5;
			this.version = '1.9';
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
		}
	};

	var reviewBans = (function () {
		var list = null;
		
		function BannedUser(id, name, until) {
			this.id = id;
			this.name = name;
			this.until = until;
		}
				
		return {
			init: function () {
				var def = jQuery.Deferred();
				var self = this;
				
				if (list === null) {
					jQuery.get('/admin/review/bans').then(function (html) {
						list = $(html).find('table.history-table tbody tr').get().map(function (el) {
							var row = $(el);
							var a = row.find('td:first-child a');
							var name = jQuery.trim(a.text());
							var id = helpers.idFromUrl(a.prop('href'));
							
							return new BannedUser(id, name, new Date(row.find('span.relativetime').prop('title')));
						});
						
						def.resolve(self);
					});
				} else {
					def.resolve(this);
				}
				
				return def.promise();
			},
			
			isBanned: function (id) {
				return list.some(function (user) {
					return user.id == id;
				});
			},
			
			getBannedUser: function (id) {
				for (var i=0;i<list.length;i++) {
					if (list[i].id == id) {
						return list[i];
					}
				}
			}
		};
	}());

	(function () {
		function initManageLink(err, settings) {
			jQuery(document).ready(function ($) {
				$('<a href="#">manage SO-mod userscript ' + (err ? '<span style="color:red">could not load settings (' + err + ')</span>' : '') + '</a>').on('click', function (e) {
					e.preventDefault();
					
					$(this).loadPopup({
						html: [
							'<div class="popup no-further-action-popup">',
								'<div class="popup-close"><a title="close this popup (or hit Esc)">&times;</a></div><h2>SO-mod Userscript Settings (v' + settings.version + '):</h2>',
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
				}).appendTo('#svnrev').before(' | ');
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
		var match = location.pathname.match(/^\/users\/(\d+)/);
		var id;

		if (match !== null && settings.settings.preferences.show_cm_count_on_profile) {
			id = match[1];

			jQuery.get('/users/history/' + id + '?type=CM+team+contacted+about+user').done(function (html) {
				var contacts = $(html).find('#user-history tbody tr');

				if (contacts.length) {
					$('<a title="cm escalations" style="padding: 2px 3px; margin-left: 0; background-color: #FB464F" class="mod-flag-indicator supernovabg" href="/users/history/' + id + '">' + contacts.length + '</a>').insertAfter('.user-moderator-link');
				}
			});
		} else {
			match = location.pathname.match(/^\/users\/history\/(\d+)/);

			if (match !== null && settings.settings.preferences.highlight_cm_contacts_on_profile) {
				id = match[1];

				jQuery.get('/users/history/' + id + '?type=CM+team+contacted+about+user').done(function (html) {
					var contacts = $(html).find('#user-history').prop('id', 'user-escalations').css('margin-bottom', 30);

					contacts.find('tbody tr').each(function () {
						var commentTd = $(this.cells[2]);
						var actionTd = $(this.cells[1]);
						var comment = commentTd.html();
						var by = comment.slice(comment.lastIndexOf('by'));

						actionTd.html(by.slice('by'.length));
						commentTd.html(comment.slice(0, comment.length - by.length));
					});

					if (contacts.length) {
						var div = $('<div class="clear-both" />');

						div.append('<h2>CM Escalations</h2>').append(contacts).prependTo('#mainbar .content-page');
					}
				});
			}
		}
	});

	Settings.init().done(function (settings) {
		$(document).ajaxSend(function (e, xhr, options) {
			if (options.url.startsWith('/admin/contact-user/template-popup/')) {
				var fromUserName = $('.gravatar-wrapper-24').prop('title');
				var toUserUrl = $('#addressing tr').filter(function () {
					return jQuery.trim($(this).find('td:first-child').text()) === 'to';
				}).find('.user-details a').prop('href');

				if (!toUserUrl || !fromUserName) {
					return;
				}

				options.dataFilter = function (data, type) {
					var html = $('<div />').html(data);

					html.find('ul').append(settings.settings.preferences.message_templates.map(function (item, i) {
						var message = 'Hello,\n\nI&#39;m writing in reference to your Stack Overflow account:\n\n' + toUserUrl + '\n\n' + item.message + '\n\nRegards  \n' + fromUserName + '  \nStack Overflow moderator';

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

	if (window.location.pathname.startsWith('/review/')) {
		$(document).ajaxSend(function (e, xhr, options) {
			if (options.url.startsWith('/review/next-task')) {
				jQuery.when(Settings.init(), reviewBans.init(), xhr).done(function (settings) {
					if (typeof settings.settings.preferences.review_ban_message_from_review === 'string') {
						$('div.review-results a').each(function () {
							var self = $(this);
							var id = helpers.idFromUrl(self.prop('href'));
							var user = reviewBans.getBannedUser(id);
							var name = jQuery.trim(self.text());
							var common = ' (<a href="#" data-user-id="' + id + '" data-user-name="' + name + '" data-message="' + helpers.escapeHtml(helpers.format(settings.settings.preferences.review_ban_message_from_review, {
								review: window.location.href
							})) + '"';

							if (user) {
								self.css('color', 'red').prop('title', 'User is banned from review until ' + user.until.toString());
								self.after(common + ' class="mattlunn-unban-user">unban</a>)');
							} else {
								self.after(common + ' class="mattlunn-ban-user">ban</a>)');
							}           
						});
					}
				});
			}
		});
	}

	Settings.init().done(function (settings) {
		if (typeof settings.settings.preferences.review_ban_message_from_profile === 'string') {
			$('div.user-panel-mod-info td:contains(blocked from reviews)').next('td').each(function () {
				var self = $(this);
				var name = jQuery.trim($('.name').text());
				var id = helpers.idFromUrl(location.href);
				var common = '<a href="#" data-user-id="' + id + '" data-user-name="' + name + '" data-message="' + helpers.escapeHtml(settings.settings.preferences.review_ban_message_from_profile) + '"';

				if (!self.find('a').length) {
					self.html(common + ' class="mattlunn-ban-user">no</a>');
				} else {
					self.append(' (' + common + ' class="mattlunn-unban-user">unban</a>)');
				}
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

	(function () {
		function toggleState(a) {
			a.toggleClass('mattlunn-unban-user mattlunn-ban-user').text(function (i, curr) {
			   return curr === 'unban' ? 'ban' : 'unban';
			}).siblings('a').css('color', a.hasClass('mattlunn-ban-user') ? '' : 'red');
		}

		$(document).on('click', 'a.mattlunn-ban-user', function (e) {         
			var self = $(this);
			var select = '<select name="days">';
			
			for (var i=1;i<=30;i++) {
				select += '<option>' + i +'</option>';
			}
			
			select += '</select>';            
			self.loadPopup({
				html: [
					'<div class="popup no-further-action-popup">',
						'<form>',
							'<div class="popup-close"><a title="close this popup (or hit Esc)">&times;</a></div><h2></h2>',
							'<input type="hidden" name="fkey" value="' + StackExchange.options.user.fkey + '" /><input type="hidden" name="userId" value="' + self.data('user-id') + '" />',
							'<textarea rows="4" style="width: 450px" name="explanation">' + helpers.escapeHtml(self.data('message')) + '</textarea><br class="clear-both">',
							'ban ' + helpers.escapeHtml(self.data('user-name')) + ' for ' + select + ' days <input type="submit" value="Ban" style="margin-left: 15px;">',
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
