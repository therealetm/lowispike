/* LOWiSPIKE hidden accounts (Oct 18, 2026). The one place that lists accounts the app keeps out of the Community galaxy
   and the Care board. Emmanuel, looking at the galaxy at 01:16: "the ones that look like test accounts ... They are not
   real." These accounts stay in the database untouched; the app only stops showing them.

   Matched by account id (profiles.id = auth user id), never by display name, so a real person who signs up later as
   "Emma" or "Test" still shows. Ids come from the live profiles table as read at 01:01 on Oct 18 (614 rows).
   Kept on purpose: Emmanuel's own "eman" account (Manuuii was hidden on Oct 25, see below), Joseph Castellar, Q, the demo bots
   Mateo / Jonas / Samir, and Emmy and Emmanuel (not decided yet).

   To hide another account: add its id here with a one-line reason, and add it to tests/hidden-accounts.test.cjs.
   Owner admin tools (remove / kick members) should read LowiHiddenAccounts instead of keeping a second list.
   API: IDS (frozen array), isHidden(personOrId), visible(list). Pure, no DOM, no storage. */
(function (root) {
    'use strict';
    const IDS = Object.freeze([
        /* Emma: 29 sign-ups in 35 minutes on Oct 17 (22:27-23:02), all level 1 with 0 XP */
        '0653ab46-7894-4b07-8601-86db5d2d2cc6', '1493b3f5-bbb8-44b6-8923-4afc5ed7ffd9', '1a8fb2a5-be68-4d1d-a3b9-cb94d61be306',
        '1afff092-f06c-491f-a0dd-b3180726ec89', '1d01c3b2-1a75-4407-bf81-b35e5fecf3cd', '1efbe75d-e879-4e0b-96ae-c8196cfed55c',
        '20573e5a-0039-481d-8da9-aeb50d4e57f6', '3416b73d-bdef-4ea4-9256-f54f05260703', '34473198-cf94-4869-8e63-4a675257b301',
        '3fd76a14-2078-416b-9b7d-ca1b6865d9f3', '50decca1-836b-4de2-a9fc-6f9a93c949e5', '53dff88c-e76a-4820-a864-7c74479dd31d',
        '55522956-d53b-4172-b297-7ee00416cd5b', '59f85d2e-dbea-4968-84d4-dcb78fe453d2', '6548c14a-b5b6-4586-ade4-a4c62d7070d0',
        '65eff374-1db5-47f5-952b-324d505bf1db', '7551329b-e06f-4b1a-9984-9e7441773cc7', '7fbae962-8746-4468-a9f7-a7d441abb801',
        '978a25c3-d13b-45d4-bdc8-bfa62889690f', 'c4c03297-c1d7-43d3-a879-16a4033e3f24', 'c588c9f8-3603-4bc0-927a-3d091f8a383a',
        'cc171b56-0b38-4a54-b304-ee005fe53cb1', 'd8138a1f-be78-4b82-967f-8c91a930fda0', 'e12bf277-db09-4e63-a017-97dcf39b51d6',
        'e329a188-8f0f-4878-b166-334459064295', 'eec2e9c3-dc85-4968-9a82-f2203f05b55a', 'f0879eb8-1b20-4302-ae00-f106ecf7338d',
        'f45d926d-ac5e-4b6f-a40f-c5b8469cc370', 'f78c98d9-f19c-42fb-bcfd-276f9020bf74',
        /* One Chat Test: made by our own test tool (tools/one-chat/check.cjs) on Oct 24 19:53, not real people (the third is server-flagged test) */
        'b0f67f50-1fac-4bf0-b874-f19d3856ea72', 'e635ae48-da7d-4ae9-a0c5-9a10a96b181f',
        /* Gatey: 16 sign-ups on Oct 10, all level 1 */
        '0767e8ef-17e3-43d7-8c5d-9c9207822b48', '097095f5-eadf-4e53-9ed5-af8e6f1c47d5', '152635eb-b97d-438c-8e76-2f2d6c44ea10',
        '28070ba2-b87b-40ab-8766-faa08e3416b5', '58c76896-3575-4045-b866-f72475fa2f67', '73976d5e-2f3a-49a0-a61b-5135b6b52cf5',
        '8f7f63bf-4ba6-47ed-aef3-31374141d90c', '9fe855d2-73ba-44fd-8b36-abe9b6eb6cec', 'a2e94b9a-44ef-47c8-b7c7-d39e28bc2be0',
        'b1986d69-e995-4b67-a561-13fe0b390345', 'c46ea8d4-ccac-4077-a882-7811000f2e57', 'd0302b54-f1cb-496e-9c9c-79d16508ac6e',
        'd3f92361-6ed5-4e5e-afb7-0b03dee5e91d', 'e7188138-8596-42a2-9ff2-dc977279ce7b', 'facca142-ded9-4867-8dca-675534eb9010',
        'fbcde800-4b5e-42df-b75a-2242bbfd97ef',
        /* Guesty: 16 sign-ups on Oct 10, all level 1 */
        '0161e683-5580-4a2b-aac7-2d56662db48a', '09b70380-7fed-4d18-bf53-27e36a117f8b', '0a94474e-3f9f-459c-8323-c16fc7a27847',
        '15ffd392-5d04-4138-8f49-d5c206d6ae7c', '1da470a4-e75f-45dc-a065-1e245c2da6c1', '24e6a193-4191-4bed-9905-16ba1c85979c',
        '469f5655-8e0d-4e91-b7f3-40fbedbdec89', '5881abdd-aca2-4cc2-afaf-035425a38a64', '69361db1-d767-4f72-81ed-eca92e462206',
        '877b9020-116a-4285-9bd4-22a815c9fa46', '9a511fb5-95a8-4875-80ef-d0c8ec2f6235', '9e450606-54fa-462f-99ef-f15b90cd240e',
        'a1bf3c14-938b-4e51-b88d-8a76f94ce379', 'c0812c67-ffce-44bf-9fe3-c7bd7cbdac0a', 'd875c7fb-a2fa-46db-9ea6-4b3ceeca1434',
        'e734e699-5aff-4155-85c9-7ea30d96abce',
        /* Test: test sign-up on Oct 17 */
        'e3cce12d-b025-4385-89f7-704595a8c06c',
        /* QA: made by our own test browser (qa-care/live.cjs) on Oct 17 at 23:56 */
        'bb1788fa-a11e-4ee9-ac28-4beef63248ae',
        /* "eman" x2: written to the live database by our own test browser (qa-care/repro.cjs) on Oct 17 at 23:58 and
           Oct 18 at 00:07 with made-up activity. Emmanuel's real eman account (83077af7-...) is NOT in this list. */
        'ca2b5daf-5d17-4866-b7ca-33bbad10d5b2', '01aa50e7-9078-4fda-97db-0accac597947',
        /* Oct 25: "Manuuii", Emmanuel's old extra (iPad) account, unused since Oct 16. He asked for one bubble for himself in
           the Room; his real account is eman (83077af7-...). The 82 anonymous "Emmanuel"/"eman" copies made by test runs are
           flagged on the server instead (profiles.test). */
        '4add63ec-61d6-4187-9c62-bd78c427be24'
    ]);
    const SET = new Set(IDS);
    const idOf = p => typeof p === 'string' ? p : (p && (p.uid || p.id || p.user_id)) || '';
    /* your own row is never hidden, even if its id were listed */
    /* + accounts the server marks as test accounts (profiles.test, bot-accounts.js), hidden everywhere like these */
    function isHidden(p) { if (p && typeof p === 'object' && p.me) return false; const id = String(idOf(p)).trim().toLowerCase(); if (!id) return false; if (SET.has(id)) return true; const B = root.LowiBotAccounts; return !!(B && B.testHidden && B.testHidden(String(idOf(p)).trim())); }
    function visible(list) { return (list || []).filter(p => !isHidden(p)); }
    const api = { IDS, isHidden, visible };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiHiddenAccounts = api;
})(typeof window !== 'undefined' ? window : globalThis);
