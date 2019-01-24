/*
    Unit testing of max TPS, APS function
*/
const expect = require('chai').expect;

const findMaxInfo = require('../src/routines/handleBlock/findMaxInfo');

let SECOND = 1000;
let date = +new Date();

function createBlocks({tp1, tp2, tp3, tp4, trx1, trx2, trx3, trx4}){
        let result = [];
        let params = arguments[0];
        for(let index = 1; index < 5; index++){
            let timestamp = new Date(date + params[`tp${index}`]).toISOString();
            result.push({ block_num: index,
                          timestamp,
                          transactions: createTRX(params[`trx${index}`])
            });
        }
        return result;
}
function createTRX(size){
        let trxArray = [];
        for(let i = 0; i < size; i++){
            let actions = { trx: { transaction: { actions: Array.from({length: size}, (v, k) => k) } } };
            trxArray.push({ status: 'confirmed', ...actions })
        }
        return trxArray;
}
async function findMax({tp1, tp2, tp3, tp4, trx1, trx2, trx3, trx4}){
    let maxTPS = 0, 
        maxAPS = 0, 
        blocks = createBlocks({tp1, tp2, tp3, tp4, trx1, trx2, trx3, trx4});
    
    for (let index = 0; index < blocks.length; index++) {
        let result;
        let previous = blocks[index];
        let current = blocks[index + 1];
        try {
            result = await findMaxInfo({current, previous});
        } catch(e){
            console.error('asyncForEach', e);
        }
        if (previous && current && result && result.max_tps && result.max_aps){
            maxTPS = (maxTPS < result.max_tps) ? result.max_tps: maxTPS;
            maxAPS = (maxAPS < result.max_aps ) ? result.max_aps: maxAPS;
        }
    }
    return {maxTPS, maxAPS};
}

describe('Testing of max TPS APS', () => {
   
   let testTPS_1 = 18;
   let testAPS_1 = Math.pow(10, 2) + Math.pow(8, 2);
   describe (`Test 1, Expected: max TPS ${testTPS_1}, max APS: ${testAPS_1}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 1000, tp2: 2000, tp3: 2500, tp4: 3000, trx1: 0, trx2: 10, trx3: 8, trx4: 7});
            console.log('\x1b[36m%s\x1b[0m', `max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_1);
            expect(maxAPS).to.equal(testAPS_1);
        });
    });

   let testTPS_2 = 17;
   let testAPS_2 = Math.pow(10, 2) + Math.pow(7, 2);
   describe (`Test 2, Expected: max TPS ${testTPS_2}, max APS: ${testAPS_2}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 1000, tp2: 2000, tp3: 2500, tp4: 3000, trx1: 0, trx2: 8, trx3: 7, trx4: 10});
            console.log('\x1b[36m%s\x1b[0m', `max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_2);
            expect(maxAPS).to.equal(testAPS_2);
        });
    });

   let testTPS_3 = 30;
   let testAPS_3 = Math.pow(30, 2);
   describe (`Test 3, Expected: max TPS ${testTPS_3}, max APS: ${testAPS_3}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 1000, tp2: 3000, tp3: 4000, tp4: 5000, trx1: 0, trx2: 10, trx3: 30, trx4: 7});
            console.log('\x1b[36m%s\x1b[0m', `max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_3);
            expect(maxAPS).to.equal(testAPS_3);
        });
    });

   let testTPS_4 = 14;
   let testAPS_4 = Math.pow(14, 2);
   describe (`Test 4, Expected: max TPS ${testTPS_4}, max APS: ${testAPS_4}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 1000, tp2: 2000, tp3: 3000, tp4: 4000, trx1: 0, trx2: 14, trx3: 8, trx4: 9});
            console.log('\x1b[36m%s\x1b[0m', `max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_4);
            expect(maxAPS).to.equal(testAPS_4);
        });
    });

   let testTPS_5 = 100;
   let testAPS_5 = Math.pow(100, 2);
   describe (`Test 5, Expected: max TPS ${testTPS_5}, max APS: ${testAPS_5}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 1000, tp2: 2000, tp3: 3000, tp4: 4000, trx1: 0, trx2: 2, trx3: 100, trx4: 40});
            console.log('\x1b[36m%s\x1b[0m', `max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_5);
            expect(maxAPS).to.equal(testAPS_5);
        });
    });
});












