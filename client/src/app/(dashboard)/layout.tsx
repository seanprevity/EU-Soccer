import React from 'react'

const layout = ({ children } : { children: React.ReactNode }) => {
   
  return (
    <div className='h-full w-full dark:bg-gray-900'>
      <main className='h-full w-full dark:bg-gray-900'>
         {children}
      </main>
    </div>
  )
}

export default layout
