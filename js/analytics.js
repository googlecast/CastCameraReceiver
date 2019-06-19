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

class CastAnalytics {
    constructor() {
        /**
         * Cast receiver context object
         * @private {cast.framework.CastReceiverContext}
         */
        this.castContext_ = cast.framework.CastReceiverContext.getInstance();

        /**
         * Cast player manager object
         * @private {cast.framework.PlayerManager}
         */
        this.playerManager_ = cast.framework.CastReceiverContext.getInstance().getPlayerManager();
    }

    set cameraId(cameraId) {
        this.cameraId_ = cameraId;
    }

    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.system.ReadyEvent
    onReady(event) {
        const detail = {
            'applicationId': this.castContext_.getApplicationData().id
        };
        console.log('READY', JSON.stringify(detail));
    }

    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.system.ShutdownEvent
    onShutdown(event) {
        console.log('SHUTDOWN <' + this.cameraId_ + '>');
    }

    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.events#.EventType#.LOADED_DATA
    onLoadedData(event) {
        const mediaInfo = this.playerManager_.getMediaInformation();
        const detail = {
            'contentId': mediaInfo.contentId,
            'streamType': mediaInfo.streamType,
            'contentType': mediaInfo.contentType,
            'playerState': this.playerManager_.getPlayerState()
        };
        console.log(event.type + ' <' + this.cameraId_ + '> ' + JSON.stringify(detail));
    }

    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.events.ErrorEvent
    onError(event) {
        const detail = {
            'detailedErrorCode': event.detailedErrorCode,
            'error': event.error
        };
        console.log(event.type + ' <' + this.cameraId_ + '> ' + JSON.stringify(detail));
    }

    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.events.BufferingEvent
    onBuffering(event) {
        const detail = {
            'playerState': 'BUFFERING',
            'currentTime': this.playerManager_.getCurrentTimeSec(),
            'duration': this.playerManager_.getDurationSec()
        };
        console.log(event.type + ' <' + this.cameraId_ + '> ' + JSON.stringify(detail));
    }

    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.events#.EventType#.PLAYING
    onPlaying(event) {
        const detail = {
            'playerState': 'PLAYING',
            'currentTime': event.currentMediaTime,
            'duration': this.playerManager_.getDurationSec()
        };
        console.log(event.type + ' <' + this.cameraId_ + '> ' + JSON.stringify(detail));
    }

    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.events#.EventType#.PAUSE
    onPause(event) {
        const detail = {
            'playerState': 'PLAYING',
            'currentTime': event.currentMediaTime,
            'duration': this.playerManager_.getDurationSec()
        };
        console.log(event.type + ' <' + this.cameraId_ + '> ' + JSON.stringify(detail));
    }

    start() {
        this.castContext_.addEventListener(
        cast.framework.system.EventType.READY,
        this.onReady.bind(this));

        this.castContext_.addEventListener(
        cast.framework.system.EventType.SHUTDOWN,
        this.onShutdown.bind(this));

        this.playerManager_.addEventListener(
        cast.framework.events.EventType.LOADED_DATA,
        this.onLoadedData.bind(this));

        this.playerManager_.addEventListener(
        cast.framework.events.EventType.ERROR,
        this.onError.bind(this));

        this.playerManager_.addEventListener(
        cast.framework.events.EventType.BUFFERING,
        this.onBuffering.bind(this));

        this.playerManager_.addEventListener(
        cast.framework.events.EventType.PLAYING,
        this.onPlaying.bind(this));

        this.playerManager_.addEventListener(
        cast.framework.events.EventType.PAUSE,
        this.onPause.bind(this));

    }
}
