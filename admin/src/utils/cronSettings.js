const cronSettings = [
  // {
  //     value: '*/1 * * * *',
  //     description: 'Every minute (only for testing)',
  //     label: 'Every minute (only for testing)',
  //     getNextRun: () => {
  //         const now = new Date();
  //         const nextRun = new Date(now.getTime() + 60 * 1000);
  //         nextRun.setSeconds(0, 0);
  //         return nextRun;
  //     },
  // },
  {
    value: '*/30 * * * *',
    description: 'Every 30 minutes',
    label: 'Every 30 minutes',
    getNextRun: () => {
      const now = new Date()
      const nextRun = new Date(now.getTime() + (30 - (now.getMinutes() % 30)) * 60 * 1000)
      nextRun.setSeconds(0, 0)
      return nextRun
    }
  },
  {
    value: '0 * * * *',
    description: 'Every hour at minute 0',
    label: 'Every hour',
    getNextRun: () => {
      const now = new Date()
      const nextRun = new Date(now.getTime() + (60 - now.getMinutes()) * 60 * 1000)
      nextRun.setMinutes(0, 0, 0)
      nextRun.setSeconds(0, 0)
      return nextRun
    }
  },
  {
    value: '0 0 * * *',
    description: 'Every day at 00:00',
    label: 'Daily',
    getNextRun: () => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
    }
  },
  {
    value: '0 0 * * 0',
    description: 'Every Sunday at 00:00',
    label: 'Weekly',
    getNextRun: () => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7 || 7), 0, 0, 0)
    }
  },
  {
    value: '0 0 1 * *',
    description: 'Every first day of the month at 00:00',
    label: 'Monthly',
    getNextRun: () => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0)
    }
  }
]

export default cronSettings
