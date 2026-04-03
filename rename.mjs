import readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise(resolve => rl.question(q, answer => resolve(answer.trim())));
}

const raw = await ask("paste cookie: ");
const token = raw.includes("|_") ? raw.split("|_").pop() : raw;
const COOKIE = `.ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_${token}`;

const NEW_NAME = await ask("rename all outfits to: ");
rl.close();

async function getCsrf() {
  const res = await fetch("https://auth.roblox.com/v2/logout", {
    method: "POST",
    headers: { Cookie: COOKIE }
  });
  return res.headers.get("x-csrf-token");
}

async function fetchOutfits() {
  const meRes = await fetch("https://users.roblox.com/v1/users/authenticated", {
    headers: { Cookie: COOKIE }
  });
  const me = await meRes.json();
  if (!me.name) {
    console.log("error: couldn't log in — check your cookie");
    process.exit(1);
  }
  console.log(`logged in as: ${me.name}`);

  let outfits = [], page = 1;
  while (true) {
    const res = await fetch(`https://avatar.roblox.com/v1/users/${me.id}/outfits?itemsPerPage=50&page=${page}`, {
      headers: { Cookie: COOKIE }
    });
    const data = await res.json();
    if (!data.data?.length) break;
    outfits.push(...data.data.filter(o => o.isEditable));
    if (data.data.length < 50) break;
    page++;
  }
  return outfits;
}

async function run() {
  const csrf = await getCsrf();
  const outfits = await fetchOutfits();
  console.log(`\nfound ${outfits.length} outfits — renaming to "${NEW_NAME}"\n`);

  let ok = 0, skipped = 0;
  for (const outfit of outfits) {
    const res = await fetch(`https://avatar.roblox.com/v3/outfits/${outfit.id}`, {
      method: "PATCH",
      headers: {
        Cookie: COOKIE,
        "x-csrf-token": csrf,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: NEW_NAME })
    });

    if (res.ok) {
      console.log(`✓ "${outfit.name}" → "${NEW_NAME}"`);
      ok++;
    } else {
      console.log(`✗ "${outfit.name}" — skipped (outfit contains items you no longer own)`);
      skipped++;
    }
  }

  console.log(`\ndone — ${ok} renamed, ${skipped} skipped`);
}

run();
