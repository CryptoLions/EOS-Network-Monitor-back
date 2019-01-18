const getActionsCount = block => {
  let trxCounter = 0;
  if (block.transactions.length < 1) {
    	return { trxCounter : 0, actionsCounter: 0 };
  }
  let actionsCounter = block.transactions.reduce(
    (result, transaction) => {
    	if (transaction.status !== 'expired'){
    		trxCounter += 1;
    	}
    	return result + (transaction.trx.transaction ? transaction.trx.transaction.actions.length : 0)
    }, 0,
  );
  return { actionsCounter, trxCounter };
};

module.exports = getActionsCount;
