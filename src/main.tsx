import { render } from 'preact';
import { App } from './ui/App';
import { buildBook, EMPTY_DRAFT } from './ui/book';
import CoalitionWorker from './ui/coalition.worker.ts?worker&inline';
import {
  connectBaselineRunner,
  connectPreviewRunner,
  connectRunner,
  createCoalitionRunner,
  type WorkerLike,
} from './ui/coalitionRunner';
import { browserStorage } from './ui/storage';
import { createStore } from './ui/store';
import {
  connectFutureScanRunner,
  createFutureScanRunner,
  type FutureScanWorker,
} from './ui/futureScanRunner';
import { installPackedStyles } from './ui/packedStyles';
import './ui/styles.css';

await installPackedStyles(document);
const root = document.getElementById('app');
if (root === null) {
  throw new Error('Missing #app root element');
}
const example = buildBook(EMPTY_DRAFT, []);
const store = createStore(
  { screen: 'book', input: example.input, autoFilled: example.filled },
  { storage: browserStorage() },
);
const createWorker =
  typeof Worker === 'undefined'
    ? null
    : () => new CoalitionWorker() as unknown as WorkerLike;
const runner = createCoalitionRunner({ createWorker });
const baselineRunner = createCoalitionRunner({ createWorker });
const previewRunner = createCoalitionRunner({
  createWorker,
  allowInPage: false,
});
connectRunner(store, runner);
connectBaselineRunner(store, baselineRunner);
connectPreviewRunner(store, previewRunner);
const futureScanRunner = createFutureScanRunner({
  createWorker:
    typeof Worker === 'undefined'
      ? null
      : () => new CoalitionWorker() as FutureScanWorker,
});
connectFutureScanRunner(store, futureScanRunner);
render(
  <App
    store={store}
    runner={runner}
    baselineRunner={baselineRunner}
    previewRunner={previewRunner}
    futureScanRunner={futureScanRunner}
  />,
  root,
);
