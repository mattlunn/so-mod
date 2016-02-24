// ==UserScript==
// @name         Helpful Moderator Userscripts
// @namespace    https://github.com/mattlunn/so-mod
// @version      1.0
// @author       Matt
// @include /^https?:\/\/(.*\.)?stackoverflow\.com/.*$/
// @include /^https?:\/\/(.*\.)?stackexchange\.com/.*$/
// ==/UserScript==
/* jshint -W097 */
'use strict';

; (function (cb) {
    var key = 'mattlunn-moderator-settings';
    var settings = localStorage.getItem(key);
    var defaults = {
        version: 1, 
        settings: {
            decline_reasons: [
                "we do not delete questions once they have accrued answers."
            ],
            remote: ""
        }
    };

    try {
        settings = JSON.parse(settings);
    } catch (e) {}

    if (settings === null || typeof settings === 'undefined') {
        settings = defaults;
    }

    function Settings(opts) {
        this.settings = opts.settings;
        this.version = opts.version;

        switch (opts.version) {
            // TODO: Upgrade paths
        }
    }

    Settings.prototype.save = function () {
        var json = JSON.stringify({
            settings: this.settings,
            version: this.version
        });

        localStorage.setItem(key, json);

        if (this.settings.remote) {
            return jQuery.post(this.settings.remote, json);
        }

        return jQuery.Deferred().resolve().promise();
    };

    Settings.prototype.defaults = defaults.settings;

    if (settings.settings.remote) {
        jQuery.getJSON(settings.settings.remote).then(function (data) {
            cb(null, new Settings(data));
        }).fail(function (xhr, err) {
            cb(err, new Settings(settings));
        });
    } else {
        cb(null, new Settings(settings)); 
    }
}(function (err, settings) {
    jQuery(document).ready(function ($) {
        $('<a href="#">manage userscript ' + (err ? '<span style="color:red">could not load settings (' + err + ')</span>' : '') + '</a>').on('click', function (e) {
            e.preventDefault();
            
            $(this).loadPopup({
                html: [
                    '<div class="popup no-further-action-popup">',
                        '<div class="popup-close"><a title="close this popup (or hit Esc)">&times;</a></div><h2>Userscript Settings:</h2>',
                        '<textarea rows="20" style="width: 900px"></textarea><br />',
                        '<button>save</button> <input type="checkbox" checked /> reload page?',
                        '<span style="float: right;"><a href="#" class="reset">defaults</a></span>',
                    '</div>'
                ].join('')
            }).then(function (popup) {
                var textarea = popup.find('textarea').val(JSON.stringify(settings.settings, null, 4));

                popup.find('button').on('click', function () {
                    var spinner = $('<span style="color: orange"> saving...</span>');
                    var json = textarea.val();

                    try {
                        settings.settings = JSON.parse(json);
                    } catch (e) {
                        return alert('Settings is not valid JSON.');
                    }

                    spinner.insertAfter(this);
                    settings.save().then(function () {
                        spinner.css('color', 'green').text(' saved');

                        if (popup.find(':checkbox').prop('checked')) {
                            window.location.reload();
                        } else {
                            spinner.delay(2000).fadeOut('slow', function () {
                                $(this).remove();
                            });
                        }
                    }).fail(function () {
                        spinner.css('color', 'red').text(' error').delay(5000).fadeOut('slow', function () {
                            $(this).remove();
                        });
                    });
                });

                popup.find('a.reset').on('click', function (e) {
                    textarea.val(JSON.stringify(settings.defaults, null, 4));
                    e.preventDefault();
                });
            });
        }).appendTo('#svnrev');
    });

    // http://stackoverflow.com/a/13371349/444991
    function escapeHtml(text) {
        return text.replace(/[\"&<>]/g, function (a) {
            return { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[a];
        });
    }

    $(document).ajaxSend(function (e, xhr, options) {
        if (/^\/admin\/dismiss-flag/.test(options.url)) {
            options.dataFilter = function (data, type) {
                var html = $('<div />').html(data);

                html.find('li').last().before(settings.settings.decline_reasons.map(function (item) {
                    return [
                        '<li style="width: 380px">',
                            '<label><input name="dismiss_Options" type="radio" value="' + escapeHtml(item) + '" style="float: left"><span class="action-desc">' + escapeHtml(item) + '</span></label>',
                        '</li>'
                    ].join('');
                }).join(''));
                
                return html.html();
            };
        }
    });
}));