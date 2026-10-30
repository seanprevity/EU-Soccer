let running = true;
let wakeUp: (() => void) | null = null;

export function isRunning(): boolean {
  return running;
}

// ctrl+C of systemctl stop finishes current work, skip sleep
export function stopOnSignals(): void {
  function stop() {
    running = false;
    if (wakeUp) wakeUp();
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

// sleep but ends early if told to stop
export function sleepUntilStopped(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, milliseconds);

    function finish() {
      clearTimeout(timer);
      wakeUp = null;
      resolve();
    }

    wakeUp = finish;
  });
}
