export function getSpeechRecognitionErrorMessage(error: unknown, language: 'en' | 'ta'): string {
  const errorCode = typeof error === 'string'
    ? error
    : error && typeof error === 'object'
      ? 'error' in error && typeof error.error === 'string'
        ? error.error
        : 'name' in error && typeof error.name === 'string'
          ? error.name
          : ''
      : '';

  const messages: Record<string, { en: string; ta: string }> = {
    'not-allowed': {
      en: 'Microphone access is blocked. Allow microphone access for this site in your browser settings, then tap the microphone again.',
      ta: 'மைக்ரோஃபோன் அனுமதி தடுக்கப்பட்டுள்ளது. உலாவி அமைப்புகளில் இந்த தளத்திற்கு மைக்ரோஃபோன் அனுமதி வழங்கி, மீண்டும் மைக்ரோஃபோனை அழுத்தவும்.',
    },
    'service-not-allowed': {
      en: 'The browser blocked its speech service. Allow microphone access and try again in Chrome or Edge.',
      ta: 'உலாவியின் பேச்சு சேவை தடுக்கப்பட்டுள்ளது. மைக்ரோஃபோன் அனுமதி வழங்கி Chrome அல்லது Edge-ல் மீண்டும் முயற்சிக்கவும்.',
    },
    NotAllowedError: {
      en: 'Microphone access is blocked. Allow microphone access for this site in your browser settings, then tap the microphone again.',
      ta: 'மைக்ரோஃபோன் அனுமதி தடுக்கப்பட்டுள்ளது. உலாவி அமைப்புகளில் இந்த தளத்திற்கு மைக்ரோஃபோன் அனுமதி வழங்கி, மீண்டும் மைக்ரோஃபோனை அழுத்தவும்.',
    },
    'audio-capture': {
      en: 'No microphone was found. Connect or enable a microphone, then try again.',
      ta: 'மைக்ரோஃபோன் கிடைக்கவில்லை. மைக்ரோஃபோனை இணைத்து அல்லது இயக்கி மீண்டும் முயற்சிக்கவும்.',
    },
    'no-speech': {
      en: 'No speech was detected. Check that your microphone is on, then speak clearly after tapping the microphone.',
      ta: 'பேச்சு எதுவும் கேட்கப்படவில்லை. மைக்ரோஃபோன் இயக்கத்தில் இருப்பதை உறுதிசெய்து, அழுத்திய பின் தெளிவாக பேசவும்.',
    },
    network: {
      en: 'Your browser could not reach its online speech-recognition service. Your internet may still be working. Try opening this app in Chrome or Edge outside an embedded browser, or type your message instead.',
      ta: 'உங்கள் உலாவியின் இணைய குரல் அறிதல் சேவையை அணுக முடியவில்லை. இணையம் இயங்கிக்கொண்டிருக்கலாம். இந்த செயலியை உட்பொதிக்கப்பட்ட உலாவிக்கு வெளியே Chrome அல்லது Edge-ல் திறக்கவும், அல்லது உங்கள் செய்தியை தட்டச்சு செய்யவும்.',
    },
    'language-not-supported': {
      en: 'Speech recognition does not support the selected language. Switch between English and Tamil and try again.',
      ta: 'தேர்ந்தெடுத்த மொழிக்கு குரல் அறிதல் ஆதரவு இல்லை. ஆங்கிலம் அல்லது தமிழை மாற்றி மீண்டும் முயற்சிக்கவும்.',
    },
    aborted: {
      en: 'Voice input was stopped. Tap the microphone to try again.',
      ta: 'குரல் உள்ளீடு நிறுத்தப்பட்டது. மீண்டும் முயற்சிக்க மைக்ரோஃபோனை அழுத்தவும்.',
    },
    InvalidStateError: {
      en: 'Voice input is already active. Wait a moment, then try again.',
      ta: 'குரல் உள்ளீடு ஏற்கனவே செயல்பாட்டில் உள்ளது. சிறிது நேரம் காத்திருந்து மீண்டும் முயற்சிக்கவும்.',
    },
  };

  return messages[errorCode]?.[language] ?? (language === 'ta'
    ? 'குரல் அறிதலை தொடங்க முடியவில்லை. மைக்ரோஃபோன் அனுமதி மற்றும் இணைய இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
    : `Speech recognition could not start${errorCode ? ` (${errorCode})` : ''}. Check microphone permission and internet connection, then try again.`);
}

export function getInsecureContextMessage(language: 'en' | 'ta'): string {
  return language === 'ta'
    ? 'குரல் உள்ளீட்டிற்கு பாதுகாப்பான இணைப்பு தேவை. HTTPS அல்லது localhost மூலம் இந்த செயலியை திறக்கவும்.'
    : 'Voice input requires a secure connection. Open this app using HTTPS or localhost.';
}

export async function useOnDeviceSpeechRecognition(
  recognition: { processLocally?: boolean },
  recognitionConstructor: {
    available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
    install?: (options: { langs: string[] }) => Promise<boolean>;
  },
  language: string
): Promise<boolean> {
  if (typeof recognitionConstructor.available !== 'function' ||
      typeof recognitionConstructor.install !== 'function' ||
      !('processLocally' in recognition)) {
    return false;
  }

  try {
    let availability = await recognitionConstructor.available({
      langs: [language],
      processLocally: true,
    });
    if (availability === 'downloadable') {
      const installed = await recognitionConstructor.install({ langs: [language] });
      if (!installed) return false;
      availability = await recognitionConstructor.available({
        langs: [language],
        processLocally: true,
      });
    }

    if (availability !== 'available') return false;
    recognition.processLocally = true;
    return true;
  } catch (error) {
    console.warn('On-device speech recognition is unavailable; using browser speech service instead.', error);
    return false;
  }
}
