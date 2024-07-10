(function(videojs) {
  const Plugin = videojs.getPlugin('plugin');

  class Trimmer extends Plugin {
    constructor(player, options) {
      super(player, options);
      this.player = player;
      this.startTime = 0;
      this.endTime = 0;

      this.createTrimmer();

      this.player.on('loadedmetadata', () => {
        this.endTime = this.player.duration();
        this.updateTrimmer();
      });

      this.bindEvents();
    }

    createTrimmer() {
      const progressControl = this.player.controlBar.progressControl;

      this.trimmerEl = document.createElement('div');
      this.trimmerEl.className = 'vjs-trimmer';
      progressControl.el().appendChild(this.trimmerEl);

      this.startHandle = document.createElement('div');
      this.startHandle.className = 'vjs-trimmer-handle start';
      progressControl.el().appendChild(this.startHandle);

      this.endHandle = document.createElement('div');
      this.endHandle.className = 'vjs-trimmer-handle end';
      progressControl.el().appendChild(this.endHandle);

      this.updateTrimmer();
    }

    bindEvents() {
      let isDraggingStart = false;
      let isDraggingEnd = false;

      const onMouseMove = (event) => {
        const rect = this.player.controlBar.progressControl.el().getBoundingClientRect();
        const pos = (event.clientX - rect.left) / rect.width * this.player.duration();

        if (isDraggingStart) {
          this.startTime = Math.min(pos, this.endTime);
          this.startTime = Math.max(this.startTime, 0);
        } else if (isDraggingEnd) {
          this.endTime = Math.max(pos, this.startTime);
          this.endTime = Math.min(this.endTime, this.player.duration());
        }

        this.updateTrimmer();
        this.player.trigger('trimmerchange', {
          startTime: this.startTime,
          endTime: this.endTime
        });
      };

      const onMouseUp = () => {
        isDraggingStart = false;
        isDraggingEnd = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      this.startHandle.addEventListener('mousedown', () => {
        isDraggingStart = true;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      this.endHandle.addEventListener('mousedown', () => {
        isDraggingEnd = true;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      this.player.on('timeupdate', () => {
        if (this.player.currentTime() < this.startTime || this.player.currentTime() > this.endTime) {
          this.player.currentTime(this.startTime);
        }
      });
    }

    updateTrimmer() {
      const progressControl = this.player.controlBar.progressControl;
      const rect = progressControl.el().getBoundingClientRect();
      const startPos = (this.startTime / this.player.duration()) * rect.width;
      const endPos = (this.endTime / this.player.duration()) * rect.width;

      this.trimmerEl.style.left = `${startPos}px`;
      this.trimmerEl.style.width = `${endPos - startPos}px`;

      this.startHandle.style.left = `${startPos - this.startHandle.offsetWidth / 2}px`;
      if(!endPos){
        this.endHandle.style.left = `100%`;
      }else{
        this.endHandle.style.left = `${endPos - this.endHandle.offsetWidth / 2}px`;
      }
    }
  }

  videojs.registerPlugin('trimmer', Trimmer);
})(videojs);
