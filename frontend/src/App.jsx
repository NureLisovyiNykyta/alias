import { Button } from "./components/Button.jsx";

function App() {
  return (
    <div className='min-h-screen w-full p-4'>
      <div className='flex w-full justify-center items-center h-full gap-3 flex-col'>
        <div className='flex gap-3'>
          <Button disabled={false} variant='primary'>Primary</Button>
          <Button disabled={true} variant='primary'>Primary</Button>
        </div>

        <div className='flex gap-3'>
          <Button disabled={false} variant='secondary'>Secondary</Button>
          <Button disabled={true} variant='secondary'>Secondary</Button>
        </div>

        <div className='flex gap-3'>
          <Button disabled={false} variant='tertiary'>Tertiary</Button>
          <Button disabled={true} variant='tertiary'>Tertiary</Button>
        </div>
      </div>
    </div>
  )
}

export default App
