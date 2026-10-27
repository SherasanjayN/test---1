import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVoiceInput } from '../src/components/VoiceInputModal';

test('voice validation parses Tamil amounts and Tamil-script phone digits', () => {
  const tamilInvestment = validateVoiceInput('investmentAmount', 'ஐயாயிரம்', 'ta');
  assert.equal(tamilInvestment.isValid, true);
  assert.equal(tamilInvestment.parsedValue, 5000);

  const smallTamilAmount = validateVoiceInput('investmentAmount', 'பத்து', 'ta');
  assert.equal(smallTamilAmount.parsedValue, 10);

  const tamilPhone = validateVoiceInput('phone', '௯௮௪௦௨௨௩௩௪௪', 'ta');
  assert.equal(tamilPhone.isValid, true);
  assert.equal(tamilPhone.parsedValue, '9840223344');
});

test('voice validation rejects invalid numbers and names without overwriting fields', () => {
  const notAnAmount = validateVoiceInput('amount', 'loan please', 'en');
  assert.equal(notAnAmount.isValid, false);

  const badPhone = validateVoiceInput('phone', '1234567890', 'en');
  assert.equal(badPhone.isValid, false);

  const tamilName = validateVoiceInput('name', 'லட்சுமி', 'ta');
  assert.equal(tamilName.isValid, true);

  const nameWithDigits = validateVoiceInput('name', 'Lakshmi 2', 'en');
  assert.equal(nameWithDigits.isValid, false);
});
