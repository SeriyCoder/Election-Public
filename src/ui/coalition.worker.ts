import {
  runCoalitionRequest,
  type CoalitionMessage,
  type CoalitionRequest,
} from './coalitionRunner';
import {
  runFutureScanRequest,
  type FutureScanRequest,
} from './futureScanRunner';

/** The worker global, typed narrowly so the DOM lib stays the only lib. */
self.onmessage = (
  event: MessageEvent<CoalitionRequest | FutureScanRequest>,
) => {
  if ('sets' in event.data) {
    runFutureScanRequest(event.data, (message) => self.postMessage(message));
  } else {
    runCoalitionRequest(event.data, (message: CoalitionMessage) =>
      self.postMessage(message),
    );
  }
};
