import { Link } from "react-router-dom";
import bg from '@/assets/background-login.png';
import { Button } from "@/components/Button.jsx";
import Input from "@/components/Input.jsx";
import RowNavigation from "@/components/RowNavigation.jsx";
import google from '@/assets/googleLogo.png';

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Sign In", id: 2 },
];

const SignIn = () => {
  return (
    <div className='flex flex-col gap-3 absolute top-[70px] left-1/2 -translate-x-1/2'>
      <RowNavigation links={LINKS}/>

      <div className='grid grid-cols-2 shadow-buttons rounded-[12px]'>
        <div className='relative w-[400px] h-[695px] rounded-l-[12px] flex items-center justify-center overflow-hidden'>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.52]"
            style={{backgroundImage: `url(${bg})`}}
          />
          <div className='flex flex-col w-[296.0511169433594px] gap-[50px] relative z-10'>
            <span
              className='uppercase text-center text-[32px] font-medium leading-[100%] tracking-[0.3em]'>Welcome</span>
            <div className='flex'>
              {Array.from({ length: 2}).map((_, index) => (
                <div key={index} className={`w-[145.55274634907474px] h-[221.50148306584046px] rounded-[16px] border-10 border-white flex items-center justify-center bg-brand-500 shadow-card-combined
                ${index % 2 !== 0 ? 'z-1 rotate-5' : 'z-2 rotate-[-5deg]'}`}>
                  <span className='font-zen text-logo text-white flex'>alias</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='w-[400px] h-[695px] rounded-r-[12px] flex justify-center bg-surface px-[60px] py-[53px]'>
          <div className='flex flex-col gap-[95px]'>
            <div className='flex flex-col w-[280px] gap-[25px] items-center'>
              <div className='w-full flex flex-col gap-[34px]'>
                <h1 className='text-h1 text-center'>Sign In</h1>

                <div className='flex flex-col w-full gap-[23px]'>
                  <Input
                    type='email'
                    label='Email'
                    placeholder='alias@gmail.com'
                    helpText='Enter a valid email address'
                    showArrow={false}
                    id='email'
                  />

                  <Input
                    type='password'
                    label='Password'
                    placeholder='Enter your password'
                    helpText='Enter a valid password'
                    showArrow={false}
                    id='password'
                  />
                </div>
              </div>

              <Button
                className='w-full'
              >
                <span>Sign In</span>
              </Button>

              <a
                href='https://google.com'
                className='w-[39px] h-[39px] flex items-center justify-center rounded-full p-[10px] bg-white shadow-buttons'
              >
                <img className='object-cover w-5 h-5' src={google} alt="Google Icon"/>
              </a>
            </div>

            <div className='flex items-center gap-1 justify-center'>
              <p className='text-text-label'>Don’t have an account?</p>
              <Link
                to='/sign-up'
                className='font-noto text-p text-brand-500'
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
