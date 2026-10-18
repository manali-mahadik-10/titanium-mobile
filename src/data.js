export const user = { name: 'Manali', upi: 'manali@titanium', balance: 125000 }

// risk: 0-29 allowed, 30-69 review, 70+ blocked
export const txns = [
  { id: 1, name: 'Tech Solutions Ltd', amount: -12500, time: 'Today, 10:45 AM', risk: 12 },
  { id: 2, name: 'Salary Deposit', amount: 55000, time: 'Yesterday, 9:00 AM', risk: 4 },
  { id: 3, name: 'Unknown Merchant', amount: -45000, time: '20 May, 2:14 AM', risk: 54 },
  { id: 4, name: 'Suspicious Transfer', amount: -200000, time: '19 May, 11:33 PM', risk: 89 },
  { id: 5, name: 'Electricity Bill', amount: -2000, time: '17 May, 11:15 AM', risk: 3 }
]

export const inr = (n) => '₹' + Math.abs(n).toLocaleString('en-IN')
export const verdict = (r) => (r < 30 ? 'Allowed' : r < 70 ? 'Review' : 'Blocked')

export const contacts = [
  { name: 'Tech Solutions', upi: 'tech@titanium' },
  { name: 'Electricity Board', upi: 'power@titanium' },
  { name: 'Amazon Pay', upi: 'amazon@titanium' }
]