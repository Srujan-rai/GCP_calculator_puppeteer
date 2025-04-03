const osMapping = {
  'windows|win': 'Paid: Windows Server',
  'rhel|red hat': 'Paid: Red Hat Enterprise Linux',
  'sles|suse': 'Paid: SLES',
  'ubuntu pro': 'Paid: Ubuntu Pro',
  'sql.*web': 'Paid: SQL Server Web',
  'sql.*enterprise': 'Paid: SQL Server Enterprise',
  'sql.*standard': 'Paid: SQL Server Standard'
};

function mapOS(value) {
  const v = value.toLowerCase().trim();

  if (v === 'sql-web') return 'Paid: SQL Server Web';
  if (v === 'sql-enterprise') return 'Paid: SQL Server Enterprise';
  if (v === 'sql-standard') return 'Paid: SQL Server Standard';
  if (v === 'ubuntu-pro' || v === 'ubuntu pro') return 'Paid: Ubuntu Pro';
  if (v === 'win') return 'Paid: Windows Server';
  if (v === 'rhel') return 'Paid: Red Hat Enterprise Linux';
  if (v === 'sles') return 'Paid: SLES';

  for (const pattern in osMapping) {
    if (new RegExp(pattern, 'i').test(v)) {
      return osMapping[pattern];
    }
  }

  return 'Free: Debian, CentOS, CoreOS, Ubuntu or BYOL';
}

function standardizeRow(row) {
  const updatedRow = { ...row };
  console.log(`[standardizeRow] Standardizing row Sl: ${updatedRow.Sl}`);

  // OS
  if (updatedRow['OS with version']) {
    updatedRow['OS with version'] = mapOS(updatedRow['OS with version']);
  }

  // No. of Instances
  const instances = parseFloat(updatedRow['No. of Instances']);
  updatedRow['No. of Instances'] = isNaN(instances) ? '0.00' : instances.toFixed(2);

  // Machine Family
  const family = (updatedRow['Machine Family'] || '').toLowerCase().trim();
  updatedRow['Machine Family'] = family
    ? family.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'General Purpose';

  // Series - Keep it as it is (in uppercase)
  updatedRow['Series'] = (updatedRow['Series'] || 'E2').toUpperCase();

  updatedRow['vCPUs'] = updatedRow['vCPUs'] || 0;

  updatedRow['Machine Type'] = (updatedRow['Machine Type'] || 'Custom machine type').toLowerCase();
  if (updatedRow['Machine Type'].includes('custom machine type')) {
    updatedRow['Machine Type'] = 'Custom machine type';
  }
  // Apply changes if machine type is 'standard', 'highmem', or 'highcpu'
  if (['standard', 'highmem', 'highcpu'].includes(updatedRow['Machine Type'])) {
    // Convert Machine Type to lowercase
    updatedRow['Machine Type'] = updatedRow['Machine Type'].toLowerCase();
    updatedRow['Machine Type'] = `${updatedRow['Series']}-${updatedRow['Machine Type']}-${updatedRow['vCPUs']}`;
    updatedRow['Machine Type'] = updatedRow['Machine Type'].toLowerCase();
  }
  if (['micro', 'small', 'medium'].includes(updatedRow['Machine Type'])) {
    // Convert Machine Type to lowercase
    updatedRow['Machine Type'] = updatedRow['Machine Type'].toLowerCase();
    updatedRow['Machine Type'] = `${updatedRow['Series']}-${updatedRow['Machine Type']}`;
    updatedRow['Machine Type'] = updatedRow['Machine Type'].toLowerCase();
  }


  // vCPUs
  updatedRow['vCPUs'] = updatedRow['vCPUs'] || 0;

  // RAM
  updatedRow['RAM'] = updatedRow['RAM'] || 0;

  // Boot Disk Capacity
  updatedRow['BootDisk Capacity'] = updatedRow['BootDisk Capacity'] || 0;

  // Datacenter Location
  updatedRow['Datacenter Location'] = updatedRow['Datacenter Location'] || 'Mumbai';

  // Avg no. of hrs
  updatedRow['Avg no. of hrs'] = updatedRow['Avg no. of hrs'] || 730;

  // Machine Class
  updatedRow['Machine Class'] = updatedRow['Machine Class'] || 'regular';

  // Special logic for Compute-optimized
  if (updatedRow['Machine Family'] === 'compute-optimized') {
    updatedRow['Series'] = 'C2';
    const vcpus = updatedRow['vCPUs'].toString().trim();
    const baseType = updatedRow['Machine Type'];
    updatedRow['Machine Type'] = vcpus
      ? `${baseType.includes('Custom machine type') ? 'Custom machine type' : baseType}-${vcpus}`
      : baseType;
  }

  return updatedRow;
}

module.exports = { standardizeRow };
