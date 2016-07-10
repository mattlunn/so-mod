# A collection of UI improvements to aid moderating on the Stack Exchange network...

## Installation

Via Tampermonkey; https://github.com/mattlunn/so-mod/raw/master/moderator.user.js

## Updates

Should happen automatically, thanks to Tampermonkey.

## Configuration

Settings can be configured by clicking "manage userscript which is in the footer of each Stack Exchange page. You'll see a JSON-formatted textarea, which will allow you to modify individual settings. Settings will be saved by clicking "save and reload". 

You can also save your settings remotely (which will allow you to share your settings across multiple devices). To do this, click "generate" to generate a URL for you to use, "set" to start using that URL, then "save and reload" to push your settings to that URL. On your other devices, just enter your unique URL, then click "set". You'll be prompted to override your local settings with those saved remotely. From this point onwards, settings will be automatically shared between your devices.

## Options

 - `decline_reasons`: Lets you specify additional decline reasons, which will show up in the "decline flag" popup.
 - `message_templates`: Lets you specify additional mod-message templates, which shows up in the "contact user" popup. Each message-template consists of a "name" (shown as the label in the UI) and a "message" (which is the actual mod-message template). The generic salutation ("I'm contacting you about your account...") and your signature ("Regards, ___, Moderator") will automatically be added to the mod-message.
 - `review_ban_message_from_profile`: Lets you ban or unban users from their profile by clicking the "banned fom review" "yes/ no" text under the "Account Info" section. Set the value to either `null` or `undefined` to disable the functionality. 
 - `review_ban_message_from_review`: Lets you ban or unban users from each review item by adding a "ban"/ "unban" link next to each reviewers name for each review task. Set the value to either `null` or `undefined`  to disable the feature. You can use the magic value `{{review}}` in your message to provide a link to the URL you are banning the user from.
 - `annotation_for_comment`: Adds an "annotate?" checkbox next to the "Add comment" button, which will automatically leave an annotation on the users profile when submitting the comment. You can use the magic values `{{post}}` and `{{comment}}` within the message, which will be substituted in the comment with a link to the post the comment was left on, and the comment text itself.
 - `highlight_cm_contacts_on_profile`: Adds an additional number next to the annotation/ flag count for a user to show how many "CM Escalations" have been raised for the user. Clicking the number will take you to the /history page, so you can see the CM escalations.
 - `show_cm_count_on_profile`: Adds an additional section to a users /history page, to show CM Escalations for the user.
 - `must_click_esc_to_close_popups`: Prevents popups automatically closing when you click outside them (e.g. misclicks, or to highlight text to include in the popup form). Instead, you must press `Esc` on your keyboard, or the `x` or `Cancel` button in the popup UI.

# Improvements, Pull Requests, Issues

... all will be gratefully received. Feel free to ping me in TL, or open Issues, PR's, fork's as you wish.

# License

Copyright (c) 2016 Matt Lunn

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
