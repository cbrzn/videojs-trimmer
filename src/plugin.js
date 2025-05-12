import videojs from "video.js";
import "videojs-offset";

const Plugin = videojs.getPlugin("plugin");
class VideoTrimmer extends Plugin {
  constructor(player, options) {
    super(player);
    this.options = videojs.obj.merge(options);

    this.startTime = 0;
    this.endTime = 0;
    this.originalDuration = 0;
    this.isDragging = false;

    this.createTrimmer();

    this.player.on("loadedmetadata", () => {
      this.originalDuration = this.player.duration();
      this.endTime = this.originalDuration;

      if (this.options.startTime) {
        this.startTime = this.options.startTime;
      }
      if (this.options.endTimeOffset) {
        this.endTime = this.originalDuration - this.options.endTimeOffset;
      }

      this.updateTrimmer();
    });

    this.player.addClass("video-js-trimmer");

    this.bindEvents();
  }

  createTrimmer() {
    // Create the trimmer container
    this.trimmerContainer = document.createElement("div");
    this.trimmerContainer.className = "vjs-trimmer-container";

    // Insert it after the video element but before the control bar
    const playerEl = this.player.el();
    playerEl.insertBefore(this.trimmerContainer, this.player.controlBar.el());

    // Create and append trimmer elements to the new container
    this.trimmerEl = document.createElement("div");
    this.trimmerEl.className = "vjs-trimmer";
    this.trimmerContainer.appendChild(this.trimmerEl);

    this.startHandle = document.createElement("div");
    this.startHandle.className = "vjs-trimmer-handle start";
    this.trimmerContainer.appendChild(this.startHandle);

    this.endHandle = document.createElement("div");
    this.endHandle.className = "vjs-trimmer-handle end";
    this.trimmerContainer.appendChild(this.endHandle);

    // Add duration display
    this.durationDisplay = document.createElement("div");
    this.durationDisplay.className = "vjs-trimmer-duration";
    this.trimmerContainer.appendChild(this.durationDisplay);

    this.updateTrimmer();
  }

  bindEvents() {
    let isDraggingStart = false;
    let isDraggingEnd = false;
    let isDraggingBar = false; // New flag for dragging the entire trimmer bar
    let lastUpdateTime = 0;
    const throttleDelay = 8; // ~30fps

    const onMouseMove = (event) => {
      if (!this.isDragging) return;

      const now = performance.now();
      if (now - lastUpdateTime < throttleDelay) return;

      lastUpdateTime = now;

      // Use trimmerContainer for positioning
      const rect = this.trimmerContainer.getBoundingClientRect();
      const pos =
        ((event.clientX - rect.left) / rect.width) * this.originalDuration;

      if (isDraggingStart) {
        // Drag start handle
        this.startTime = Math.min(Math.max(pos, 0), this.endTime);
      } else if (isDraggingEnd) {
        // Drag end handle
        this.endTime = Math.max(
          Math.min(pos, this.originalDuration),
          this.startTime
        );
      } else if (isDraggingBar) {
        // Drag entire trimmer bar
        const trimmedDuration = this.endTime - this.startTime; // Preserve duration
        const newStartTime = Math.max(
          0,
          Math.min(pos, this.originalDuration - trimmedDuration)
        );
        this.startTime = newStartTime;
        this.endTime = newStartTime + trimmedDuration;
      }

      this.player.currentTime(0);
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        this.updateTrimmer();
        this.player.trigger("trimmerchange", {
          startTime: this.startTime,
          endTime: this.endTime,
        });
      });
    };

    const onMouseUp = () => {
      isDraggingStart = false;
      isDraggingEnd = false;
      isDraggingBar = false;
      this.isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    this.startHandle.addEventListener("mousedown", (event) => {
      event.preventDefault(); // Prevent text selection
      isDraggingStart = true;
      this.isDragging = true;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    this.endHandle.addEventListener("mousedown", (event) => {
      event.preventDefault(); // Prevent text selection
      isDraggingEnd = true;
      this.isDragging = true;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Trimmer bar drag
    this.trimmerEl.addEventListener("mousedown", (event) => {
      // Only trigger bar drag if not clicking on handles
      if (!event.target.classList.contains("vjs-trimmer-handle")) {
        event.preventDefault();
        isDraggingBar = true;
        this.isDragging = true;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      }
    });
  }

  updateTrimmer() {
    const startPos = (this.startTime / this.originalDuration) * 100;
    const endPos = (this.endTime / this.originalDuration) * 100;

    this.trimmerEl.style.left = `${startPos}%`;
    this.trimmerEl.style.width = `${endPos - startPos}%`;

    this.startHandle.style.left = `${startPos}%`;
    this.endHandle.style.left = `${endPos}%`;

    this.player.offset({
      start: this.startTime,
      end: this.endTime,
    });

    // Update duration display
    const trimmedDuration = this.endTime - this.startTime;
    this.durationDisplay.textContent = `Trimmed duration: ${this.formatTime(
      trimmedDuration
    )}`;
  }

  createTimeMarkers() {
    // Append markers to trimmerContainer instead of progressControl
    const markerContainer = document.createElement("div");
    markerContainer.className = "vjs-time-markers";
    this.trimmerContainer.appendChild(markerContainer);

    const numMarkers = 20; // Number of markers to display
    for (let i = 0; i <= numMarkers; i++) {
      const marker = document.createElement("div");
      marker.className = "vjs-time-marker";
      const time = (i / numMarkers) * this.originalDuration;
      marker.style.left = `${(i / numMarkers) * 100}%`;

      const timeLabel = document.createElement("span");
      timeLabel.className = "vjs-time-label";
      timeLabel.textContent = this.formatTime(time);

      marker.appendChild(timeLabel);
      markerContainer.appendChild(marker);
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
}

// Register the plugin with video.js.
videojs.registerPlugin("trimmer", VideoTrimmer);

export default VideoTrimmer;
