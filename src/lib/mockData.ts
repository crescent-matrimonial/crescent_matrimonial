import type { Match, Person, QuestionField } from './types';

const mkField = (
  key: string,
  question: string,
  answer: string,
  multi = false,
  section: 'about' | 'looking' = 'about',
): QuestionField => ({
  key,
  question,
  answer,
  values: answer
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  multi,
  section,
});

interface RawPersonInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender?: 'male' | 'female';
  age: number;
  location: string;
  occupation: string;
  source_sheet: 'men' | 'women';
  profile_photo_url?: string | null;
  about_you_raw: QuestionField[];
  looking_for_raw: QuestionField[];
}

function buildPerson(input: RawPersonInput): Person {
  const about_you: Record<string, QuestionField> = {};
  const looking_for: Record<string, QuestionField> = {};
  input.about_you_raw.forEach((f) => (about_you[f.key] = f));
  input.looking_for_raw.forEach((f) => (looking_for[f.key] = f));
  return {
    is_deleted: false,
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
    updated_at: new Date('2025-01-10T10:00:00Z').toISOString(),
    profile_photo_url: input.profile_photo_url ?? null,
    preferences: {},
    admin_notes: null,
    sheet_key: `${input.first_name}|${input.last_name}|${input.email}`.toLowerCase(),
    id: input.id,
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    gender: input.gender ?? (input.source_sheet === 'men' ? 'male' : 'female'),
    age: input.age,
    location: input.location,
    occupation: input.occupation,
    source_sheet: input.source_sheet,
    full_name: `${input.first_name} ${input.last_name}`,
    about_you,
    looking_for,
  } as Person;
}

const menRaw = [
  {
    id: 'm1',
    first_name: 'Aarav',
    last_name: 'Khan',
    email: 'aarav.khan@example.com',
    age: 28,
    location: 'Toronto, ON',
    occupation: 'Software Engineer',
    source_sheet: 'men' as const,
    about: {
      'Age Range': '28',
      Gender: 'Male',
      Location: 'Toronto, ON',
      Education: 'Bachelors in Computer Science',
      Occupation: 'Software Engineer',
      'Marital Status': 'Never Married',
      'Prayer Frequency': 'Daily (5 times)',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Reading, Hiking, Board games',
    },
    looking: {
      "Partner's Age Range": '25-32',
      "Partner's Location": 'Toronto, ON',
      "Partner's Education": 'Bachelors',
      "Partner's Occupation": 'Any professional',
      "Partner's Marital Status": 'Never Married',
      "Partner's Prayer": 'Daily',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Reading, Hiking',
    },
  },
  {
    id: 'm2',
    first_name: 'Bilal',
    last_name: 'Rahman',
    email: 'bilal.rahman@example.com',
    age: 32,
    location: 'Mississauga, ON',
    occupation: 'Pharmacist',
    source_sheet: 'men' as const,
    about: {
      'Age Range': '32',
      Gender: 'Male',
      Location: 'Mississauga, ON',
      Education: 'Doctor of Pharmacy',
      Occupation: 'Pharmacist',
      'Marital Status': 'Never Married',
      'Prayer Frequency': 'Daily (5 times)',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Cricket, Volunteering, Travel',
    },
    looking: {
      "Partner's Age Range": '27-34',
      "Partner's Location": 'Toronto, Mississauga, ON',
      "Partner's Education": 'Bachelors',
      "Partner's Occupation": 'Healthcare, Teaching',
      "Partner's Marital Status": 'Never Married',
      "Partner's Prayer": 'Daily',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Travel, Volunteering',
    },
  },
  {
    id: 'm3',
    first_name: 'Yusuf',
    last_name: 'Ahmed',
    email: 'yusuf.ahmed@example.com',
    age: 30,
    location: 'Calgary, AB',
    occupation: 'Civil Engineer',
    source_sheet: 'men' as const,
    about: {
      'Age Range': '30',
      Gender: 'Male',
      Location: 'Calgary, AB',
      Education: 'Masters in Civil Engineering',
      Occupation: 'Civil Engineer',
      'Marital Status': 'Never Married',
      'Prayer Frequency': 'Often',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Soccer, Photography, Cooking',
    },
    looking: {
      "Partner's Age Range": '26-33',
      "Partner's Location": 'Calgary, AB',
      "Partner's Education": 'Bachelors',
      "Partner's Occupation": 'Any',
      "Partner's Marital Status": 'Never Married',
      "Partner's Prayer": 'Often',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Soccer, Cooking, Photography',
    },
  },
  {
    id: 'm4',
    first_name: 'Imran',
    last_name: 'Sheikh',
    email: 'imran.sheikh@example.com',
    age: 35,
    location: 'Vancouver, BC',
    occupation: 'Financial Analyst',
    source_sheet: 'men' as const,
    about: {
      'Age Range': '35',
      Gender: 'Male',
      Location: 'Vancouver, BC',
      Education: 'MBA',
      Occupation: 'Financial Analyst',
      'Marital Status': 'Divorced',
      'Prayer Frequency': 'Daily (5 times)',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Investing, Cycling, Coffee',
    },
    looking: {
      "Partner's Age Range": '30-38',
      "Partner's Location": 'Vancouver, BC',
      "Partner's Education": 'Bachelors',
      "Partner's Occupation": 'Any professional',
      "Partner's Marital Status": 'Never Married, Divorced',
      "Partner's Prayer": 'Daily',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Cycling, Coffee',
    },
  },
];

const womenRaw = [
  {
    id: 'w1',
    first_name: 'Aisha',
    last_name: 'Malik',
    email: 'aisha.malik@example.com',
    age: 26,
    location: 'Toronto, ON',
    occupation: 'UX Designer',
    source_sheet: 'women' as const,
    about: {
      'Age Range': '26',
      Gender: 'Female',
      Location: 'Toronto, ON',
      Education: 'Bachelors in Design',
      Occupation: 'UX Designer',
      'Marital Status': 'Never Married',
      'Prayer Frequency': 'Daily (5 times)',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Reading, Illustration, Yoga',
    },
    looking: {
      "Partner's Age Range": '27-32',
      "Partner's Location": 'Toronto, ON',
      "Partner's Education": 'Bachelors',
      "Partner's Occupation": 'Software, Engineering',
      "Partner's Marital Status": 'Never Married',
      "Partner's Prayer": 'Daily',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Reading, Hiking',
    },
  },
  {
    id: 'w2',
    first_name: 'Fatima',
    last_name: 'Noor',
    email: 'fatima.noor@example.com',
    age: 29,
    location: 'Mississauga, ON',
    occupation: 'Registered Nurse',
    source_sheet: 'women' as const,
    about: {
      'Age Range': '29',
      Gender: 'Female',
      Location: 'Mississauga, ON',
      Education: 'Bachelors of Nursing',
      Occupation: 'Registered Nurse',
      'Marital Status': 'Never Married',
      'Prayer Frequency': 'Daily (5 times)',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Travel, Volunteering, Calligraphy',
    },
    looking: {
      "Partner's Age Range": '30-35',
      "Partner's Location": 'Mississauga, Toronto, ON',
      "Partner's Education": 'Bachelors',
      "Partner's Occupation": 'Pharmacy, Healthcare',
      "Partner's Marital Status": 'Never Married',
      "Partner's Prayer": 'Daily',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Travel, Volunteering',
    },
  },
  {
    id: 'w3',
    first_name: 'Zainab',
    last_name: 'Hussain',
    email: 'zainab.hussain@example.com',
    age: 31,
    location: 'Calgary, AB',
    occupation: 'Marketing Manager',
    source_sheet: 'women' as const,
    about: {
      'Age Range': '31',
      Gender: 'Female',
      Location: 'Calgary, AB',
      Education: 'Bachelors in Marketing',
      Occupation: 'Marketing Manager',
      'Marital Status': 'Never Married',
      'Prayer Frequency': 'Often',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Photography, Cooking, Hiking',
    },
    looking: {
      "Partner's Age Range": '29-34',
      "Partner's Location": 'Calgary, AB',
      "Partner's Education": 'Bachelors',
      "Partner's Occupation": 'Any',
      "Partner's Marital Status": 'Never Married',
      "Partner's Prayer": 'Often',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Soccer, Photography, Cooking',
    },
  },
  {
    id: 'w4',
    first_name: 'Maryam',
    last_name: 'Iqbal',
    email: 'maryam.iqbal@example.com',
    age: 33,
    location: 'Vancouver, BC',
    occupation: 'Dentist',
    source_sheet: 'women' as const,
    about: {
      'Age Range': '33',
      Gender: 'Female',
      Location: 'Vancouver, BC',
      Education: 'Doctor of Dental Surgery',
      Occupation: 'Dentist',
      'Marital Status': 'Never Married',
      'Prayer Frequency': 'Daily (5 times)',
      'Dietary Habits': 'Halal only',
      'Drinking/Smoking': 'No',
      Hobbies: 'Cycling, Coffee, Painting',
    },
    looking: {
      "Partner's Age Range": '32-40',
      "Partner's Location": 'Vancouver, BC',
      "Partner's Education": 'Masters',
      "Partner's Occupation": 'Any professional',
      "Partner's Marital Status": 'Never Married, Divorced',
      "Partner's Prayer": 'Daily',
      "Partner's Diet": 'Halal only',
      "Partner's Smoking/Drinking": 'No',
      "Partner's Hobbies": 'Cycling, Coffee',
    },
  },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const isMulti = (header: string): boolean =>
  /select all that apply/i.test(header);

function parseAbout(raw: Record<string, string>): QuestionField[] {
  return Object.entries(raw).map(([question, answer]) =>
    mkField(slug(question), question, answer, isMulti(question), 'about'),
  );
}

function parseLooking(raw: Record<string, string>): QuestionField[] {
  return Object.entries(raw).map(([question, answer]) =>
    mkField(slug(question), question, answer, isMulti(question), 'looking'),
  );
}

export const MOCK_PEOPLE: Person[] = [
  ...menRaw.map((m) => {
    const { about, looking, ...rest } = m;
    void about;
    void looking;
    return buildPerson({
      ...rest,
      about_you_raw: parseAbout(m.about),
      looking_for_raw: parseLooking(m.looking),
    });
  }),
  ...womenRaw.map((w) => {
    const { about, looking, ...rest } = w;
    void about;
    void looking;
    return buildPerson({
      ...rest,
      about_you_raw: parseAbout(w.about),
      looking_for_raw: parseLooking(w.looking),
    });
  }),
];

const iso = (s: string) => new Date(s).toISOString();

export const MOCK_MATCHES: Match[] = [
  {
    id: 'match-1',
    person_1_id: 'm1',
    person_2_id: 'w1',
    paired_at: iso('2025-02-01T12:00:00Z'),
    exchanged_contact: true,
    outcome: 'pending',
    outcome_set_at: null,
    notes: 'High compatibility on location, education, prayer, hobbies.',
  },
  {
    id: 'match-2',
    person_1_id: 'm2',
    person_2_id: 'w2',
    paired_at: iso('2025-01-15T12:00:00Z'),
    exchanged_contact: true,
    outcome: 'worked_out',
    outcome_set_at: iso('2025-03-10T12:00:00Z'),
    notes: 'Both families agreed to proceed; wedding planned.',
  },
  {
    id: 'match-3',
    person_1_id: 'm3',
    person_2_id: 'w3',
    paired_at: iso('2025-01-20T12:00:00Z'),
    exchanged_contact: false,
    outcome: 'failed',
    outcome_set_at: iso('2025-02-18T12:00:00Z'),
    notes: 'Different long-term city plans; incompatible.',
  },
  {
    id: 'match-4',
    person_1_id: 'm4',
    person_2_id: 'w4',
    paired_at: iso('2025-02-10T12:00:00Z'),
    exchanged_contact: true,
    outcome: 'manually_removed',
    outcome_set_at: iso('2025-02-25T12:00:00Z'),
    notes: 'Candidate paused the process; revisit later.',
  },
];
