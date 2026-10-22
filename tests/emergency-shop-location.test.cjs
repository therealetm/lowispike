'use strict';
/* Oct 22, 2026 (Emmanuel: "The shop emergency shop button that shows you what you can buy in your location is wrong because
   it's showing only [the maker's town] ... when they click on share my location, they should see their address and the nearest
   grocery shopping options, and then they can click on that. And then based on that, it shows them the products that are in the
   store ... Don't make this based on my location, the creator."). No fixed place anywhere; the person's own position (or a typed
   town / postcode) -> address -> nearest supermarkets sorted by distance -> a store -> its chain's products, or the general list. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require(path.join(root, 'store-picks-core.js'));

const HAMBURG = { lat: 53.5511, lon: 9.9937 };
const MUNICH = { lat: 48.1374, lon: 11.5755 };
const CREATOR = new RegExp(['flens', 'burg'].join(''), 'i');

function overpass(at) {
    return { elements: [
        { type: 'node', id: 1, lat: at.lat + 0.02, lon: at.lon, tags: { shop: 'supermarket', name: 'Kaufland', brand: 'Kaufland', 'addr:street': 'Weit', 'addr:housenumber': '9', 'addr:postcode': '20095', 'addr:city': 'Hamburg' } },
        { type: 'way', id: 2, center: { lat: at.lat + 0.001, lon: at.lon }, tags: { shop: 'supermarket', name: 'REWE City', brand: 'REWE', 'addr:street': 'Nah', 'addr:housenumber': '1', 'addr:postcode': '20095', 'addr:city': 'Hamburg' } },
        { type: 'node', id: 3, lat: at.lat + 0.001, lon: at.lon + 0.0001, tags: { shop: 'supermarket', name: 'REWE City', brand: 'REWE' } },
        { type: 'node', id: 4, lat: at.lat + 0.005, lon: at.lon, tags: { shop: 'convenience', name: 'Kiosk Mitte' } },
        { type: 'node', id: 5, lat: at.lat + 0.008, lon: at.lon, tags: { shop: 'supermarket', brand: 'Netto Marken-Discount', name: 'Netto' } },
        { type: 'node', id: 6, lat: at.lat + 0.01, lon: at.lon, tags: { shop: 'supermarket' } }
    ] };
}
function fakeFetch(log, opts) {
    opts = opts || {};
    return (url, init) => {
        log.push({ url, init });
        const ok = body => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
        if (/nominatim.*reverse/.test(url)) return ok({ lat: '53.5511', lon: '9.9937', display_name: 'Rathausmarkt 1, Altstadt, Hamburg, 20095, Deutschland', address: { road: 'Rathausmarkt', house_number: '1', postcode: '20095', city: 'Hamburg', country_code: 'de' } });
        if (/nominatim.*search.*q=supermarket/.test(url)) {
            if (opts.nominatimDown) return Promise.resolve({ ok: false, status: 503, json: () => Promise.reject(new Error('x')) });
            const vb = /viewbox=([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)/.exec(url).slice(1).map(Number);
            const at = { lat: (vb[1] + vb[3]) / 2, lon: (vb[0] + vb[2]) / 2 };
            return ok(overpass(at).elements.filter(e => e.tags.shop === 'supermarket').map(e => ({ osm_type: e.type, osm_id: e.id, lat: String(e.lat || e.center.lat), lon: String(e.lon || e.center.lon),
                type: e.tags.shop, name: e.tags.name || '', extratags: e.tags.brand ? { brand: e.tags.brand } : {},
                address: { road: e.tags['addr:street'], house_number: e.tags['addr:housenumber'], postcode: e.tags['addr:postcode'], city: e.tags['addr:city'], country_code: 'de' } })));
        }
        if (/nominatim.*search/.test(url)) return ok(/zzzz/.test(url) ? [] : [{ lat: String(MUNICH.lat), lon: String(MUNICH.lon), display_name: 'München, Bayern, Deutschland', address: { city: 'München', postcode: '80331', country_code: 'de' } }]);
        if (/interpreter/.test(url)) {
            if (opts.overpassDown && /overpass-api\.de/.test(url)) return Promise.resolve({ ok: false, status: 504, json: () => Promise.reject(new Error('x')) });
            const m = /around%3A(\d+)%2C([\d.]+)%2C([\d.]+)/.exec(init.body);
            return ok(overpass({ lat: +m[2], lon: +m[3] }));
        }
        return Promise.reject(new Error('unexpected ' + url));
    };
}

test('no fixed creator place anywhere in the shop code, data, seed data or cache list', () => {
    for (const f of ['store-picks.js', 'store-picks-core.js', 'grocery-hunt.js', 'tools/shop-data/build.py', 'tools/shop-data/add-images.py', 'sw.js', 'index.html', 'store-picks.css']) {
        assert.doesNotMatch(read(f), CREATOR, f + ' names no fixed town');
    }
    assert.ok(!fs.existsSync(path.join(root, 'data/shop/stores.json')), 'no bundled shop map');
    assert.doesNotMatch(read('sw.js'), /stores\.json/);
    assert.doesNotMatch(read('grocery-hunt.js'), /stores\.json/);
    for (const f of ['store-picks.js', 'store-picks-core.js', 'grocery-hunt.js']) assert.doesNotMatch(read(f), /54\.7\d|9\.43\d/, f + ' has no fixed coordinates');
    const meta = fs.readdirSync(path.join(root, 'data/shop')).filter(f => f.endsWith('.json'));
    meta.forEach(f => { const d = JSON.parse(read('data/shop/' + f)); assert.doesNotMatch(String(d.source || '') + String(d.note || ''), CREATOR, f); });
});

test('chains: OpenStreetMap shops map to the product ranges we have', () => {
    assert.equal(C.chainOf({ brand: 'REWE', name: 'REWE City' }), 'rewe');
    assert.equal(C.chainOf({ name: 'nahkauf' }), 'rewe');
    assert.equal(C.chainOf({ brand: 'EDEKA', name: 'EDEKA Nord' }), 'edeka');
    assert.equal(C.chainOf({ name: 'Marktkauf' }), 'edeka');
    assert.equal(C.chainOf({ brand: 'Lidl' }), 'lidl');
    assert.equal(C.chainOf({ brand: 'ALDI Süd' }), 'aldi');
    assert.equal(C.chainOf({ brand: 'Kaufland' }), 'kaufland');
    assert.equal(C.chainOf({ brand: 'Netto Marken-Discount' }), 'netto');
    assert.equal(C.chainOf({ brand: 'Netto' }, 'DK'), 'salling');
    assert.equal(C.chainOf({ brand: 'Føtex' }), 'salling');
    assert.equal(C.chainOf({ brand: 'PENNY' }), 'penny');
    assert.equal(C.chainOf({ name: 'famila' }), 'famila');
    assert.equal(C.chainOf({ name: 'Kiosk Mitte' }), null, 'no chain data -> general list');
    assert.equal(C.chainOf({}), null);
    const ranges = new Set(fs.readdirSync(path.join(root, 'data/shop')).map(f => f.replace('.json', '')));
    ['rewe', 'edeka', 'lidl', 'aldi', 'kaufland', 'netto', 'salling', 'penny'].forEach(c => assert.ok(ranges.has(c), c + ' has a range file'));
    C.GENERAL.forEach(c => assert.ok(ranges.has(c), 'general list part ' + c));
});

test('shops: sorted by distance, nearest first, duplicates folded, unnamed shops left out, address read', () => {
    const list = C.parseShops(overpass(HAMBURG), HAMBURG);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].km >= list[i - 1].km, 'sorted by distance');
    assert.equal(list[0].name, 'REWE City');
    assert.equal(list[0].chain, 'rewe');
    assert.equal(list[0].addr, 'Nah 1, 20095 Hamburg');
    assert.equal(list[0].town, 'Hamburg');
    assert.ok(list[0].km < 0.2);
    assert.equal(list.filter(s => s.name === 'REWE City').length, 1, 'point + outline of one shop count once');
    assert.ok(!list.some(s => !s.name), 'shops without a name are left out');
    assert.equal(list[list.length - 1].name, 'Kaufland');
    assert.ok(list.every(s => /^osm:/.test(s.id)));
    assert.equal(list.find(s => s.name === 'Kiosk Mitte').chain, null);
    const q = C.overpassQuery(HAMBURG, 2500);
    assert.match(q, /supermarket\|convenience\|discount/);
    assert.match(q, /around:2500,53\.551,9\.994/, 'position leaves the phone rounded to about 100 m');
    assert.equal(C.viewbox(HAMBURG, 0.012).split(',').length, 4);
    C.viewbox(HAMBURG, 0.012).split(',').forEach(v => assert.ok(/^-?\d+(\.\d{1,3})?$/.test(v), 'box rounded: ' + v));
    const fromNom = C.parseShops(C.nomToElements([{ osm_type: 'node', osm_id: 7, lat: '53.552', lon: '9.994', type: 'supermarket', name: 'Lidl', extratags: {}, address: { road: 'A', house_number: '2', postcode: '20095', city: 'Hamburg', country_code: 'de' } }]), HAMBURG);
    assert.equal(fromNom[0].chain, 'lidl');
    assert.equal(fromNom[0].addr, 'A 2, 20095 Hamburg');
    assert.equal(fromNom[0].id, 'osm:n7');
});

test('lookup with a mocked network: address, nearest shops, typed town, fallback endpoint, cache', async () => {
    const log = [];
    const L = C.lookup(fakeFetch(log), { gap: 0 });
    const p = await L.address(HAMBURG, 'de');
    assert.equal(p.line, 'Rathausmarkt 1, 20095 Hamburg');
    assert.equal(p.cc, 'DE');
    assert.match(log[0].url, /^https:\/\/nominatim\.openstreetmap\.org\/reverse\?format=jsonv2/);
    assert.match(log[0].url, /accept-language=de/);
    const shops = await L.shops(HAMBURG, 'DE');
    assert.equal(shops[0].name, 'REWE City');
    const n = log.length;
    await L.shops(HAMBURG, 'DE');
    assert.equal(log.length, n, 'same spot asked once per session');
    const m = await L.search('80331', 'en');
    assert.ok(Math.abs(m.lat - MUNICH.lat) < 1e-6);
    const ms = await L.shops({ lat: m.lat, lon: m.lon }, m.cc);
    assert.ok(ms.length >= 3);
    assert.ok(ms[0].lat > 48 && ms[0].lat < 49, 'Munich shops for a Munich postcode');
    assert.equal(await L.search('zzzz', 'en'), null, 'unknown place -> null, the UI says so');
    assert.equal(await L.search('a', 'en'), null, 'too short -> nothing sent');
    assert.ok(log.some(x => /q=supermarket&viewbox=/.test(x.url)) && !log.some(x => /interpreter/.test(x.url)), 'Nominatim first, Overpass not needed');
    const log2 = [];
    const L2 = C.lookup(fakeFetch(log2, { overpassDown: true, nominatimDown: true }), { gap: 0 });
    const s2 = await L2.shops(MUNICH);
    assert.ok(s2.length > 0, 'Nominatim down -> Overpass; first Overpass server down -> the next one');
    assert.ok(log2.some(x => /kumi/.test(x.url)));
    log.concat(log2).forEach(x => assert.doesNotMatch(x.url, /lowispike|github\.io/, 'nothing goes to our own server'));
});

test('general list: REWE + EDEKA merged with the same columns', () => {
    const J = f => JSON.parse(read('data/shop/' + f + '.json'));
    const a = J('rewe'), b = J('edeka');
    const g = C.merge([a, b]);
    assert.equal(g.rows.length, a.rows.length + b.rows.length);
    assert.deepEqual(g.cols, a.cols);
    assert.ok(g.general);
    assert.match(g.source, /Open Food Facts/);
    assert.ok(C.build(g).counts.pass > 100);
    assert.equal(C.merge([]), null);
});

test('the panel source: Share my location -> address -> nearest shops -> products; fallbacks; nothing about position saved', () => {
    const js = read('store-picks.js');
    assert.match(js, /Share my location[\s\S]*Meinen Standort teilen[\s\S]*Compartir mi ubicación/);
    assert.match(js, /Town or postcode[\s\S]*Ort oder Postleitzahl[\s\S]*Ciudad o código postal/);
    assert.match(js, /Skip: show the general lists/);
    assert.match(js, /Supermarkets near you[\s\S]*Supermärkte in deiner Nähe[\s\S]*Supermercados cerca de ti/);
    assert.match(js, /this is the general list\. Supermarkets mostly carry the same items/);
    assert.match(js, /OpenStreetMap contributors[\s\S]*openstreetmap\.org\/copyright/);
    assert.match(js, /navigator\.geolocation\.getCurrentPosition/);
    assert.match(js, /err\.code === 1/, 'denied location has its own message and leads to the town field');
    // the saved state holds the chosen shop by name and address only, never a position
    const saveObj = /S = \{ range: RANGE\[s\.chain\] \? s\.chain : 'general', store: \{([^}]*)\} \}/.exec(js);
    assert.ok(saveObj, 'tapping a shop saves it');
    assert.doesNotMatch(saveObj[1], /\blat\b|\blon\b/);
    assert.match(js, /delete S\.store/, 'a shop saved from the old bundled list is dropped');
    assert.match(js, /where = null; place = null; near = null/, 'position forgotten when the panel closes');
    assert.doesNotMatch(js, /localStorage\.setItem\([^)]*where/);
    const gh = read('grocery-hunt.js');
    assert.match(gh, /data-gh="place"/, 'grocery hunt can look up a typed town too');
    assert.match(gh, /where = null; stores = null;/);
    // the input for the town is not the list search box (that one repaints on every key)
    assert.match(js, /class="stp-wq"/);
    assert.match(read('store-picks.css'), /\.stp-wq \{[\s\S]*font-size: 16px/, 'no iPhone zoom on focus');
    new vm.Script(js); new vm.Script(gh);
});
