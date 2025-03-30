module.exports = async function calculateGCPCosts(row, index) {

  console.log(`🧪 Running dummy compute for Sl ${row.Sl}`);

  // Simulate delay for testing
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    price: `$${(Math.random() * 100).toFixed(2)}`,
    url: `https://dummy-cost-url.com/${row.mode}/sl-${row.Sl}`,
    machineType: row['Machine Type'] || 'n1-standard-1',
    specs: '2 vCPUs, 8 GB RAM'
  };
};
