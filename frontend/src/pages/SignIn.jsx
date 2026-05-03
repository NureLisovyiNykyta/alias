import { Link, useNavigate } from "react-router-dom";
import bg from '@/assets/background-login.png';
import { Button } from "@/components/Button.jsx";
import Input from "@/components/Input.jsx";
import RowNavigation from "@/components/RowNavigation.jsx";
import google from '@/assets/googleLogo.png';
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleLoginMutation, useLoginMutation } from "@/api/auth.js";
import { useGoogleLogin } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Sign In", id: 2 },
];

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const SignIn = () => {
  const { setTokens } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
  });

  const [currentEmail, currentPassword] = useWatch({
    control,
    name: ["email", "password"],
  });

  const loginMutation = useLoginMutation({
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      navigate('/');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Invalid email or password";
      setError("password", { type: "server", message: errorMessage });
    },
  });

  const onSubmit = (data) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  const googleLoginMutation = useGoogleLoginMutation({
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      navigate('/');
    },
    onError: (error, googleToken) => {
      sessionStorage.setItem('temp_google_token', googleToken);
      navigate('/auth/google-sign-up');
    }
  });

  const handleGoogleSuccess = (credentialResponse) => {
    googleLoginMutation.mutate(credentialResponse.credential);
  };

  const isEmailValid = !!currentEmail && currentEmail.length > 0 && !errors.email;
  const isPasswordValid = !!currentPassword && currentPassword.length > 0 && !errors.password;

  return (
    <div className='flex flex-col gap-3 absolute top-[70px] left-1/2 -translate-x-1/2'>
      <RowNavigation links={LINKS}/>

      <div className='grid grid-cols-2 shadow-buttons rounded-[12px]'>
        <div className='relative w-[400px] h-[695px] rounded-l-[12px] flex items-center justify-center overflow-hidden'>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.52]"
            style={{ backgroundImage: `url(${bg})` }}
          />
          <div className='flex flex-col w-[296px] gap-[50px] relative z-10'>
            <span
              className='uppercase text-center text-[32px] font-medium leading-[100%] tracking-[0.3em]'>Welcome</span>
            <div className='flex'>
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className={`w-[145px] h-[221px] rounded-[16px] border-10 border-white flex items-center justify-center bg-brand-500 shadow-card-combined
                ${index % 2 !== 0 ? 'z-1 rotate-5' : 'z-2 rotate-[-5deg]'}`}>
                  <span className='font-zen text-logo text-white flex'>alias</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='w-[400px] h-[695px] rounded-r-[12px] flex justify-center bg-surface px-[60px] py-[53px]'>
          <div className='flex flex-col gap-[95px]'>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className='flex flex-col w-[280px] gap-[25px] items-center'
            >
              <div className='w-full flex flex-col gap-[34px]'>
                <h1 className='text-h1 text-center'>Sign In</h1>

                <div className='flex flex-col w-full gap-[23px]'>
                  <Input
                    id='email'
                    type='email'
                    label='Email'
                    placeholder='alias@gmail.com'
                    showArrow={false}
                    {...register('email')}
                    error={!!errors.email}
                    isValid={isEmailValid}
                    helpText={errors.email ? errors.email.message : 'Enter a valid email address'}
                    successText="Correct format"
                  />

                  <Input
                    id='password'
                    type='password'
                    label='Password'
                    placeholder='Enter your password'
                    showArrow={false}
                    {...register('password')}
                    error={!!errors.password}
                    isValid={isPasswordValid}
                    helpText={errors.password ? errors.password.message : 'Enter your password'}
                    successText=""
                    showForgot={true}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className='w-full'
                disabled={loginMutation.isPending || !isEmailValid || !isPasswordValid}
              >
                <span>{loginMutation.isPending ? 'Signing in' : 'Sign In'}</span>
              </Button>

              <div className="flex justify-center w-full h-[39px] mt-2 overflow-hidden rounded-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    console.error('Google Login Failed');
                  }}
                  shape="circle"
                  size="large"
                />
              </div>
            </form>

            <div className='flex items-center gap-1 justify-center'>
              <p className='text-text-label'>Don’t have an account?</p>
              <Link
                to='/auth/sign-up'
                className='font-noto text-p text-brand-500 hover:text-blue-500 transition-colors'
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
