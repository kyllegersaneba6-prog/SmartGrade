const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { getPasswordValidationError } = require('../services/passwordPolicy');

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

function askHidden(question) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal so passwords are not exposed.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      const key = chunk.toString('utf8');
      if (key.includes('\u0003')) return finish(new Error('Cancelled.'));
      if (key.includes('\r') || key.includes('\n')) return finish();
      if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1);
        return;
      }
      if (!key.startsWith('\u001b') && key !== '\u0000') value += key;
    };

    process.stdout.write(question);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in backend/.env.');
  }

  const firstName = await ask('Superadmin first name: ');
  const lastName = await ask('Superadmin last name: ');
  const username = await ask('Username [superadmin]: ', 'superadmin');
  if (!firstName || !lastName || username.length < 3 || username.length > 64) {
    throw new Error('First name, last name, and a username of 3–64 characters are required.');
  }

  const password = await askHidden('New password (input hidden): ');
  const passwordError = getPasswordValidationError(password);
  if (passwordError) throw new Error(passwordError);
  const confirmation = await askHidden('Confirm password (input hidden): ');
  if (password !== confirmation) throw new Error('Passwords do not match.');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: existingSuperadmins, error: lookupError } = await supabase
    .from('staff_users')
    .select('id')
    .eq('system_role', 'superadmin')
    .limit(1);
  if (lookupError) throw new Error('Could not verify whether a superadmin account already exists.');
  if (existingSuperadmins?.length) {
    throw new Error('A superadmin account already exists. Use the in-app password change flow instead.');
  }

  const { data: existingUsername, error: usernameError } = await supabase
    .from('staff_users')
    .select('id')
    .eq('username', username)
    .limit(1);
  if (usernameError) throw new Error('Could not verify whether the requested username is available.');
  if (existingUsername?.length) throw new Error('That username is already in use.');

  const passwordHash = await bcrypt.hash(password, 12);
  const { error: insertError } = await supabase.from('staff_users').insert([{
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`,
    username,
    department: null,
    system_role: 'superadmin',
    password: passwordHash,
  }]);
  if (insertError) throw new Error('Could not create the superadmin account. Check database connectivity and try again.');

  process.stdout.write('Superadmin account created. Store the credentials securely.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
