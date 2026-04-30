import RowNavigation from "@/components/RowNavigation.jsx";
import mark from '@/assets/whiteDoneMark.svg';

const AuthLayout = ({
                      breadcrumbs,
                      title,
                      subtitle,
                      currentStep,
                      totalSteps,
                      children
                    }) => {
  return (
    <div className='flex flex-col gap-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
      <RowNavigation links={breadcrumbs}/>

      <div
        className='w-[800px] min-h-[695px] bg-surface rounded-[12px] shadow-buttons py-10 px-21 flex flex-col items-center gap-[39px]'>

        <div className="text-center flex flex-col gap-10">
          <h1 className="text-h1">{title}</h1>
          {subtitle && <h2 className="text-h2">{subtitle}</h2>}
        </div>

        <div className="flex items-center w-full">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const isCompleted = index + 1 < currentStep;
            const isCurrent = index + 1 === currentStep;

            return (
              <div key={index} className={`flex items-center ${index < totalSteps - 1 ? 'flex-1' : ''}`}>
                <div
                  className={`shrink-0 w-[29px] h-[29px] shadow-buttons rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-decorative-700'
                      : isCurrent
                        ? 'bg-white'
                        : 'bg-white border-2 border-text-label'
                  }`}>
                  {isCompleted ? (
                    <img src={mark} alt="Done" className="shrink-0"/>
                  ) : isCurrent ? (
                    <div className='shrink-0 w-[14.5px] h-[14.5px] bg-decorative-700 rounded-full'/>
                  ) : null}
                </div>

                {index < totalSteps - 1 && (
                  <div className={`w-full h-[3px] transition-colors ${
                    index + 1 < currentStep ? 'bg-decorative-700' : 'bg-text-label'
                  }`}/>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="text-h2 text-text-label text-center">Step {currentStep} of {totalSteps}</h2>

        <div className="w-full">
          {children}
        </div>

      </div>
    </div>
  );
};
export default AuthLayout;
