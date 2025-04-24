"use client";

import React, { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared";
import { X } from "lucide-react";

// Declare custom properties on Window interface
declare global {
  interface Window {
    createProposalTourEndCallback?: () => void;
  }
}

type CreateProposalTourProps = {
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export function CreateProposalTour({ isRunning, setIsRunning, activeTab, setActiveTab }: CreateProposalTourProps) {
  // Helper to end the tour
  const endTour = () => {
    localStorage.setItem("hasSeenCreateProposalTour", "true");
    setIsRunning(false);
  };

  useEffect(() => {
    if (isRunning) {
      // Inject custom Apple-like popover styles
      const styleId = 'apple-popover-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .apple-popover.driver-popover {
            background: #fff !important;
            border-radius: 18px !important;
            box-shadow: 0 8px 32px 0 rgba(60,60,60,0.10), 0 1.5px 4px 0 rgba(60,60,60,0.08);
            border: 1px solid #ececec !important;
            padding: 1.5rem 1.5rem 1rem 1.5rem !important;
            color: #222 !important;
            font-family: 'Inter', 'San Francisco', 'Segoe UI', Arial, sans-serif;
            min-width: 320px;
            max-width: 380px;
          }
          .apple-popover .driver-popover-title {
            font-size: 1.18rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #111;
            letter-spacing: -0.01em;
          }
          .apple-popover .driver-popover-description {
            font-size: 1rem;
            color: #444;
            margin-bottom: 0.5rem;
          }
          .apple-popover .driver-popover-arrow {
            color: #fff;
            filter: drop-shadow(0 2px 8px rgba(60,60,60,0.10));
          }
          .apple-popover .driver-popover-close-btn {
            top: 18px !important;
            right: 18px !important;
            background: transparent !important;
            color: #aaa !important;
            border-radius: 50%;
            transition: background 0.15s;
          }
          .apple-popover .driver-popover-close-btn:hover {
            background: #f2f2f2 !important;
            color: #222 !important;
          }
          .apple-popover .driver-popover-footer {
            border-top: none !important;
            margin-top: 1.2rem;
            padding: 0;
            background: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .apple-popover .driver-popover-progress-text {
            color: #bbb;
            font-size: 0.95rem;
            font-weight: 500;
          }
          .apple-popover .driver-popover-prev-btn,
          .apple-popover .driver-popover-next-btn {
            border-radius: 8px !important;
            border: none !important;
            background: #f5f5f7 !important;
            color: #222 !important;
            font-weight: 500;
            font-size: 1rem;
            padding: 0.45rem 1.1rem !important;
            margin: 0 0.2rem;
            box-shadow: none !important;
            transition: background 0.15s;
          }
          .apple-popover .driver-popover-next-btn {
            background: #222 !important;
            color: #fff !important;
          }
          .apple-popover .driver-popover-prev-btn:hover,
          .apple-popover .driver-popover-next-btn:hover {
            background: #e5e5ea !important;
            color: #111 !important;
          }
          .apple-popover .driver-popover-end-btn {
            border-radius: 8px !important;
            border: none !important;
            background: #e5e5ea !important;
            color: #222 !important;
            font-weight: 500;
            font-size: 1rem;
            padding: 0.45rem 1.1rem !important;
            margin-left: 0.5rem;
            margin-right: 0;
            box-shadow: none !important;
            transition: background 0.15s;
          }
          .apple-popover .driver-popover-end-btn:hover {
            background: #222 !important;
            color: #fff !important;
          }
          /* Skip button style */
          .tour-skip-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            border: none;
            background: transparent;
            cursor: pointer;
            color: #aaa;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 1000;
          }
          .tour-skip-btn:hover {
            background-color: #f2f2f2;
            color: #222;
          }
          .dark .tour-skip-btn:hover {
            background-color: #333;
            color: #eee;
          }
          /* Fix for Next button text */
          .driver-popover-next-btn::after {
            display: none !important;
          }
          /* Hide close button on last step */
          .apple-popover[data-last-step="true"] .driver-popover-close-btn {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Add skip button functionality to the driver.js
      const addSkipButton = (isLastStep = false) => {
        setTimeout(() => {
          const popover = document.querySelector('.driver-popover');
          if (popover) {
            // Set data attribute for last step to control close button visibility
            if (isLastStep) {
              popover.setAttribute('data-last-step', 'true');
            }

            if (!document.querySelector('.tour-skip-btn')) {
              const skipBtn = document.createElement('button');
              skipBtn.className = 'tour-skip-btn';
              skipBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
              skipBtn.setAttribute('aria-label', 'Skip tour');
              skipBtn.title = 'Skip tour';
              skipBtn.onclick = endTour;
              popover.appendChild(skipBtn);
            }
          }
        }, 100);
      };

      const moveToTab = (tabName: string) => {
        setActiveTab(tabName);
      };

      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: false,
        stagePadding: 5,
        progressText: '{{current}} / {{total}}',
        popoverClass: 'apple-popover',
        nextBtnText: 'Next',
        prevBtnText: 'Previous',
        doneBtnText: 'Done',
        steps: [
          {
            popover: {
              title: "Create Proposal Workflow ✨",
              description: `<p>Welcome to the Proposal Creator!</p><p>Let's walk through creating a professional client proposal in just a few steps.</p>`,
              align: "center",
              onNextClick: () => {
                moveToTab("template");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => {
              moveToTab("template");
              addSkipButton();
            }
          },
          {
            element: ".template-tab-content",
            popover: {
              title: "1. Select a Template 📋",
              description: `<p>Start by choosing a template for your proposal.</p><p>This will determine the structure and style of your proposal.</p>`,
              side: "bottom",
              align: "start",
              onNextClick: () => {
                moveToTab("details");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => {
              moveToTab("template");
              addSkipButton();
            }
          },
          {
            element: ".tab-trigger[value='details']",
            popover: {
              title: "2. Add Proposal Details 📝",
              description: `<p>Next, you'll add client information and project details.</p><p>Click here to enter basic information about the proposal.</p>`,
              side: "bottom",
              onNextClick: () => {
                moveToTab("details");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => addSkipButton()
          },
          {
            element: ".details-tab-content",
            popover: {
              title: "Fill in Client Details ✏️",
              description: `<p>Add client name, project title, and other essential information.</p><p>This helps personalize your proposal for the client.</p>`,
              side: "bottom",
              align: "start",
              onNextClick: () => {
                moveToTab("variables");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => {
              moveToTab("details");
              addSkipButton();
            }
          },
          {
            element: ".tab-trigger[value='variables']",
            popover: {
              title: "3. Set Variables 🔢",
              description: `<p>Variables help calculate costs and timelines.</p><p>Click here to customize the values for your project scope.</p>`,
              side: "bottom",
              onNextClick: () => {
                moveToTab("variables");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => addSkipButton()
          },
          {
            element: ".parameters-tab-content",
            popover: {
              title: "Adjust Variable Values ⚙️",
              description: `<p>Set values for each variable like project scope, timeline, etc.</p><p>These values will automatically calculate costs in the next step.</p>`,
              side: "bottom",
              align: "start",
              onNextClick: () => {
                moveToTab("costs");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => {
              moveToTab("variables");
              addSkipButton();
            }
          },
          {
            element: ".tab-trigger[value='costs']",
            popover: {
              title: "4. Calculate Costs 💰",
              description: `<p>Review and adjust the cost calculations.</p><p>Click here to see how variables affect your pricing.</p>`,
              side: "bottom",
              onNextClick: () => {
                moveToTab("costs");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => addSkipButton()
          },
          {
            element: ".categories-tab-content",
            popover: {
              title: "Review Cost Calculations 📊",
              description: `<p>Here you can see how costs are calculated based on your variables.</p><p>Adjust formulas or values if needed before finalizing.</p>`,
              side: "bottom",
              align: "start",
              onNextClick: () => {
                moveToTab("preview");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => {
              moveToTab("costs");
              addSkipButton();
            }
          },
          {
            element: ".tab-trigger[value='preview']",
            popover: {
              title: "5. Preview & Send 👁️",
              description: `<p>The final step is reviewing your proposal.</p><p>Click here to see how it will appear to your client.</p>`,
              side: "bottom",
              onNextClick: () => {
                moveToTab("preview");
                driverObj.moveNext();
              }
            },
            onHighlighted: () => addSkipButton()
          },
          {
            element: ".preview-tab-content",
            popover: {
              title: "Ready to Share! 🎉",
              description: `<p>Your proposal is ready to be shared with your client.</p><p>You can download it as a PDF or send it directly via email.</p>`,
              side: "top",
              align: "start",
            },
            onHighlighted: () => {
              moveToTab("preview");
              addSkipButton(true);
            }
          }
        ],
        onDestroyed: endTour
      });
      window.createProposalTourEndCallback = endTour;
      driverObj.drive();
      return () => {
        driverObj.destroy();
        delete window.createProposalTourEndCallback;
      };
    }
  }, [isRunning, setActiveTab]);

  return (
    isRunning ? (
      <div className="fixed top-2 right-2 z-[1000] hidden">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={endTour}
                className="rounded-full p-2 bg-white/90 shadow-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:bg-zinc-800/90 dark:text-gray-400 dark:hover:bg-zinc-700 dark:hover:text-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Skip tour</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    ) : null
  );
}