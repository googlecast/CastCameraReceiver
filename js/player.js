/*
Copyright 2019 Google LLC. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Full list of supportedMediaCommands:
 * https://developers.google.com/cast/docs/reference/messages#MediaStatus
 * https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.messages#.Command
 */
const SUPPORTED_MEDIA_COMMANDS =
cast.framework.messages.Command.STREAM_VOLUME |
cast.framework.messages.Command.STREAM_MUTE |
cast.framework.messages.Command.PAUSE;

/**
 * Cast receiver context object
 */
const castContext_ = cast.framework.CastReceiverContext.getInstance();

/**
 * Player manager object
 */
const playerManager_ = castContext_.getPlayerManager();

/**
 * Enable debug log from Google Cast SDK
 */
// castContext_.setLoggerLevel(cast.framework.LoggerLevel.DEBUG);

/**
 * Log events for analytics
 */
const analytics_ = new CastAnalytics();
analytics_.start();

/**
 * Debug Logger Object
 * setEnabled: Enable debug logger and show a 'DEBUG MODE' overlay at top left corner.
 * showDebugLogs: Displays the logs through an overlay on the receiver.
 * Uncomment setEnabled() and showDebugLogs() to enable this functionality.
 * Make sure to change setEnabled to false when deploying to production.
 */
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();
// castDebugLogger.setEnabled(true);
// castDebugLogger.showDebugLogs(true);

// enables logging for described events at the configured logging level
castDebugLogger.loggerLevelByEvents = {
  'cast.framework.events.EventType.PLAYER_LOADING': cast.framework.LoggerLevel.INFO,
  'cast.framework.events.EventType.MEDIA_STATUS': cast.framework.LoggerLevel.DEBUG
}

const LOG_RECEIVER = 'MyReceiverApp';
const LOG_BACKEND = 'Backend';
const LOG_AUTH = 'Authentication';

// associates each log tag with allowed logging level
castDebugLogger.loggerLevelByTags = {
  [LOG_RECEIVER]: cast.framework.LoggerLevel.INFO, //LOG_RECEIVER logs INFO WARN and ERROR
  [LOG_BACKEND]: cast.framework.LoggerLevel.WARNING, // LOG_BACKEND logs WARN and ERROR
  [LOG_AUTH]: cast.framework.LoggerLevel.ERROR // LOG_AUTH logs ERROR
}

/**
 * Configuration to customize playback behavior.
 * https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.PlaybackConfig
 */
const playbackConfig = new cast.framework.PlaybackConfig();
// Minimum number of buffered segments to start/resume playback.
playbackConfig.autoResumeNumberOfSegments = 1;
// Duration of buffered media in seconds to start buffering.
playbackConfig.autoPauseDuration = 1;
// Duration of buffered media in seconds to start/resume playback after auto-paused due to buffering.
playbackConfig.autoResumeDuration = 1;

castContext_.start({
  playbackConfig: playbackConfig,
  supportedCommands: SUPPORTED_MEDIA_COMMANDS
});

/**
 * Make async requests to fetch contentUrl.
 * @param {string} requestUrl
 * @param {string} credential
 * @param {cast.framework.messages.LoadRequestData} request
 * @returns {cast.framework.messages.LoadRequestData}
 */
function fetchAssetAndAuth(requestUrl, credential, request) {
  return new Promise(function(resolve, reject) {
    castDebugLogger.info(LOG_BACKEND, 'Fetching Asset and Authentication');

    // check credential
    fetch('res/camera_info.json')
      .then((response) => response.json())
      .then(function(asset) {
        if (!asset.allowed) {
          reject('invalid users');
        }

        castDebugLogger.info(LOG_AUTH, 'Authentication passed for credential: '
          + credential);

        // fetch stream URL
        let streamUrl = '';
        if (asset.streamUrl) {
          streamUrl = asset.streamUrl;
          castDebugLogger.info(LOG_BACKEND, 'streamUrl provided through backend');
        } else {
          streamUrl = request.media.entity;
          castDebugLogger.info(LOG_BACKEND, 'streamUrl provided through request');
        }

        // set playable stream URL and content Type
        request.media.contentUrl = streamUrl;
        if (streamUrl.endsWith('m3u8')) {
            request.media.contentType = 'application/x-mpegURL';
        } else if (streamUrl.endsWith('mpd')) {
            request.media.contentType = 'application/dash+xml';
        } else if (streamUrl.endsWith('mp4')) {
            request.media.contentType = 'video/mp4';
        } else {
            castDebugLogger.warn(LOG_BACKEND, 'Unknown contentType for ' + streamUrl);
        }


        // Set metadata title for both in Google Home App and CAF Receiver UI.
        // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.messages.GenericMediaMetadata
        var metadata = new cast.framework.messages.GenericMediaMetadata();
        analytics_.cameraId = asset.cameraId;
        metadata.title = asset.cameraId;
        metadata.subtitle = asset.cameraInfo;
        request.media.metadata = metadata;

        // Log the modified request for debugging purposes
        castDebugLogger.debug(LOG_BACKEND, 'new request values:'
          + '\nmetadata.title: ' + metadata.title
          + '\nmetadata.subtitle: ' + metadata.subtitle
          + '\nmedia.contentUrl: ' + request.media.contentUrl
          + '\nmedia.contentType: ' + request.media.contentType);

        resolve(request);
      });
  });
};

/**
 * Load message interceptor
 */
playerManager_.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  loadRequestData => {
    castDebugLogger.info(LOG_RECEIVER, 'Intercepted ' + loadRequestData.type
      + ' request with requestId ' + loadRequestData.requestId);

    // Requests from web-senders.
    if (!loadRequestData.media || !loadRequestData.media.entity) {
        castDebugLogger.info(LOG_RECEIVER, 'Request sent from web sender, media.entity missing');
        return loadRequestData;
    }

    // Requests from Google Assistant
    return fetchAssetAndAuth(loadRequestData.media.entity,
      loadRequestData.credentials, loadRequestData)
      .then((modifiedRequest) => {
        return modifiedRequest;
      })
      .catch (() => { // invalid users
        castDebugLogger.error(LOG_AUTH, 'Authentication failed for credentials: '
          + loadRequestData.credentials);

        const err = new cast.framework.messages.ErrorData(
                  cast.framework.messages.ErrorType.LOAD_FAILED);
        err.reason = cast.framework.messages.ErrorReason.AUTHENTICATION_EXPIRED;
        return err;
      });
  });
