/*
    Unit testing of max TPS, APS function
*/
const expect = require('chai').expect;

const findMaxInfo = require('../src/routines/handleBlock/findMaxInfo');

let SECOND           = 1000;
let actionsArraySize = 10;

function createBlocks({tp1, tp2, tp3, tp4, trx1, trx2, trx3, trx4}){
        let result = [];
        let params = arguments[0];
        for(let index = 1; index <= 4; index++){
            let timestamp        = new Date(params[`tp${index}`]).toISOString();
            let prevDate         = (params[`tp${index - 1}`] !== undefined) ? +new Date(params[`tp${index - 1}`]) : 1;
            let beforePrevDate   = (params[`tp${index - 2}`] !== undefined) ? +new Date(params[`tp${index - 2}`]) : 1;        
            result.push({ block_num: index,
                          timestamp,
                          producedInSeconds: (prevDate === 1 || beforePrevDate === 1) ? 0.5 : (prevDate - beforePrevDate) / SECOND,
                          transactions: createTRX(params[`trx${index}`])
            });
        }
        return result;
}
function createTRX(size){
        let trxArray = [];
        for(let i = 0; i < size; i++){
            let actions = { trx: { transaction: { actions: Array.from({length: actionsArraySize}, (v, k) => k) } } };
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
        previous.producedInSeconds = (current) ? current.producedInSeconds: 0.5;
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
   let testAPS_1 = testTPS_1 * 10;
   describe (`Test 1, Expected: max TPS ${testTPS_1}, max APS: ${testAPS_1}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 1000, tp2: 1500, tp3: 2000, tp4: 2500, trx1: 0, trx2: 10, trx3: 8, trx4: 7});
            console.log('\x1b[36m%s\x1b[0m', `======= max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_1);
            expect(maxAPS).to.equal(testAPS_1);
        });
    });

   let testTPS_2 = 17;
   let testAPS_2 = testTPS_2 * 10;
   describe (`Test 2, Expected: max TPS ${testTPS_2}, max APS: ${testAPS_2}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 0, tp2: 500, tp3: 1000, tp4: 1500, trx1: 0, trx2: 8, trx3: 7, trx4: 10});
            console.log('\x1b[36m%s\x1b[0m', `======= max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_2);
            expect(maxAPS).to.equal(testAPS_2);
        });
    });

   let testTPS_3 = 20;
   let testAPS_3 = testTPS_3 * 10;
   describe (`Test 3, Expected: max TPS ${testTPS_3}, max APS: ${testAPS_3}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 0, tp2: 1500, tp3: 3000, tp4: 3500, trx1: 0, trx2: 10, trx3: 30, trx4: 7});
            console.log('\x1b[36m%s\x1b[0m', `======= max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_3);
            expect(maxAPS).to.equal(testAPS_3);
        });
    });

   let testTPS_4 = 15;
   let testAPS_4 = testTPS_4 * 10;
   describe (`Test 4, Expected: max TPS ${testTPS_4}, max APS: ${testAPS_4}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 0, tp2: 1000, tp3: 1500, tp4: 2500, trx1: 0, trx2: 14, trx3: 8, trx4: 10});
            console.log('\x1b[36m%s\x1b[0m', `======= max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_4);
            expect(maxAPS).to.equal(testAPS_4);
        });
    });

   let testTPS_5 = 101;
   let testAPS_5 = testTPS_5 * 10;
   describe (`Test 5, Expected: max TPS ${testTPS_5}, max APS: ${testAPS_5}`, () => {
        it('done', async () => {
            let { maxTPS, maxAPS } = await findMax({tp1: 0, tp2: 1000, tp3: 1500, tp4: 3000, trx1: 0, trx2: 2, trx3: 100, trx4: 40});
            console.log('\x1b[36m%s\x1b[0m', `======= max TPS: ${maxTPS}, max APS: ${maxAPS}`);
            expect(maxTPS).to.equal(testTPS_5);
            expect(maxAPS).to.equal(testAPS_5);
        });
    });

});












