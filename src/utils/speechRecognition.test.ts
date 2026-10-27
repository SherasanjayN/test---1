import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSpeechRecognitionErrorMessage,
  useOnDeviceSpeechRecognition,
} from './speechRecognition';

test('network speech errors explain browser service failure without blaming internet access', () => {
  const message = getSpeechRecognitionErrorMessage({ error: 'network' }, 'en');
  assert.match(message, /browser could not reach its online speech-recognition service/i);
  assert.match(message, /type your message instead/i);
  assert.doesNotMatch(message, /check your internet connection/i);
});

test('uses an available local speech model', async () => {
  const recognition: { processLocally?: boolean } = { processLocally: false };
  const constructor = {
    available: async () => 'available',
    install: async () => true,
  };
  assert.equal(await useOnDeviceSpeechRecognition(recognition, constructor, 'en-IN'), true);
  assert.equal(recognition.processLocally, true);
});

test('installs a downloadable local speech model before using it', async () => {
  const recognition: { processLocally?: boolean } = { processLocally: false };
  let availabilityChecks = 0;
  let installed = false;
  const constructor = {
    available: async () => {
      availabilityChecks += 1;
      return installed ? 'available' : 'downloadable';
    },
    install: async () => {
      installed = true;
      return true;
    },
  };
  assert.equal(await useOnDeviceSpeechRecognition(recognition, constructor, 'ta-IN'), true);
  assert.equal(availabilityChecks, 2);
  assert.equal(recognition.processLocally, true);
});

test('keeps browser-managed recognition when no local speech model exists', async () => {
  const recognition: { processLocally?: boolean } = { processLocally: false };
  const constructor = {
    available: async () => 'unavailable',
    install: async () => false,
  };
  assert.equal(await useOnDeviceSpeechRecognition(recognition, constructor, 'ta-IN'), false);
  assert.equal(recognition.processLocally, false);
});
