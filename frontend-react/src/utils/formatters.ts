


export const formatCurrency = (amount: number | string, currency: string = '₽'): string => {
  const numeric = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'));
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const rounded = Math.round(safe);
  return `${rounded.toLocaleString('ru-RU')} ${currency}`;
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return formatDate(d);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const formatUserName = (user: {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  display_username?: string | null;
  email?: string;
}): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.first_name) return user.first_name;
  return getDisplayUsername(user);
};

export const isEmailLike = (value?: string | null): boolean => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const sha256Hex = (input: string): string => {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const ascii = unescape(encodeURIComponent(input));
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate += 1) {
    if (!isComposite[candidate]) {
      for (let multiple = candidate * candidate; multiple < 312; multiple += candidate) {
        isComposite[multiple] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter += 1;
    }
  }

  for (let i = 0; i < ascii.length; i += 1) {
    const j = i >> 2;
    words[j] = words[j] || 0;
    words[j] |= ascii.charCodeAt(i) << ((3 - (i % 4)) * 8);
  }

  const bitIndex = ascii.length >> 2;
  words[bitIndex] = words[bitIndex] || 0;
  words[bitIndex] |= 0x80 << ((3 - (ascii.length % 4)) * 8);
  words[((ascii.length + 8) >> 6 << 4) + 15] = asciiBitLength;

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i += 1) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        (hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ (~e & hash[6]))
          + k[i]
          + (w[i] = i < 16
            ? w[i]
            : (
                w[i - 16]
                + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                + w[i - 7]
                + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
              ) | 0)
        ) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i += 1) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  return hash.map((value) => (value >>> 0).toString(16).padStart(8, '0')).join('');
};

const getStableAnonymousNumber = (user: {
  id?: number | string;
  username?: string | null;
  display_username?: string | null;
  email?: string | null;
}): number => {
  const seedSource = `${user.id ?? ''}|${user.username ?? ''}|${user.email ?? ''}` || 'user';
  const digest = sha256Hex(seedSource);
  return 1000 + (parseInt(digest.slice(0, 8), 16) % 9000);
};

export const getDisplayUsername = (user: {
  id?: number | string;
  username?: string | null;
  display_username?: string | null;
  email?: string | null;
}): string => {
  const displayUsername = user.display_username?.trim();
  if (displayUsername) {
    return displayUsername;
  }

  const username = user.username?.trim();
  if (username && !isEmailLike(username)) {
    return username;
  }

  return `user${getStableAnonymousNumber(user)}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
