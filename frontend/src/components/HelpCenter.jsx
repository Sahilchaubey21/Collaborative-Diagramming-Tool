import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';

const HelpCenter = () => {
  const [openFAQs, setOpenFAQs] = useState(new Set());

  const toggleFAQ = (index) => {
    const newOpenFAQs = new Set(openFAQs);
    if (newOpenFAQs.has(index)) {
      newOpenFAQs.delete(index);
    } else {
      newOpenFAQs.add(index);
    }
    setOpenFAQs(newOpenFAQs);
  };

  const faqs = [
    {
      question: "How do I add shapes to my diagram?",
      answer: "You can add shapes by clicking on the shape tools in the toolbar, or by dragging and dropping from the shape library."
    },
    {
      question: "Can I import existing diagrams from other tools?",
      answer: "Yes, you can import diagrams from various formats including Visio, Lucidchart, and other popular diagramming tools."
    },
    {
      question: "What are the different collaboration roles and permissions?",
      answer: "We offer Owner, Editor, and Viewer permissions. Owners have full control, Editors can modify content, and Viewers can only view diagrams."
    }
  ];

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-white group/design-root overflow-x-hidden" style={{fontFamily: 'Inter, "Noto Sans", sans-serif'}}>
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-[#111418] tracking-light text-[32px] font-bold leading-tight">Help Center</p>
                <p className="text-[#60758a] text-sm font-normal leading-normal">Find answers to common questions or contact our support team for assistance.</p>
              </div>
            </div>
            
            {/* Getting Started */}
            <h2 className="text-[#111418] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Getting Started</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4">
              <div className="flex flex-1 gap-3 rounded-lg border border-[#dbe0e6] bg-white p-4 flex-col">
                <div className="text-[#111418]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-[#111418] text-base font-bold leading-tight">Creating Your First Diagram</h2>
                  <p className="text-[#60758a] text-sm font-normal leading-normal">Learn how to create a new diagram from scratch or from a template.</p>
                </div>
              </div>
              <div className="flex flex-1 gap-3 rounded-lg border border-[#dbe0e6] bg-white p-4 flex-col">
                <div className="text-[#111418]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M169.64,134.33l44.77-19.46A16,16,0,0,0,213,85.07L52.92,32.8A16,16,0,0,0,32.8,52.92L85.07,213a15.83,15.83,0,0,0,14.41,11l.79,0a15.83,15.83,0,0,0,14.6-9.59h0l19.46-44.77L184,219.31a16,16,0,0,0,22.63,0l12.68-12.68a16,16,0,0,0,0-22.63Zm-69.48,73.76.06-.05Zm95.15-.09-49.66-49.67a16,16,0,0,0-26,4.94l-19.42,44.65L48,48l159.87,52.21-44.64,19.41a16,16,0,0,0-4.94,26L208,195.31ZM88,24V16a8,8,0,0,1,16,0v8a8,8,0,0,1-16,0ZM8,96a8,8,0,0,1,8-8h8a8,8,0,0,1,0,16H16A8,8,0,0,1,8,96ZM120.85,28.42l8-16a8,8,0,0,1,14.31,7.16l-8,16a8,8,0,1,1-14.31-7.16Zm-81.69,96a8,8,0,0,1-3.58,10.74l-16,8a8,8,0,0,1-7.16-14.31l16-8A8,8,0,0,1,39.16,124.42Z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-[#111418] text-base font-bold leading-tight">Navigating the Interface</h2>
                  <p className="text-[#60758a] text-sm font-normal leading-normal">Get familiar with the layout and tools available in the diagram editor.</p>
                </div>
              </div>
              <div className="flex flex-1 gap-3 rounded-lg border border-[#dbe0e6] bg-white p-4 flex-col">
                <div className="text-[#111418]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-[#111418] text-base font-bold leading-tight">Collaborating with Others</h2>
                  <p className="text-[#60758a] text-sm font-normal leading-normal">Invite team members to collaborate on your diagrams in real-time.</p>
                </div>
              </div>
              <div className="flex flex-1 gap-3 rounded-lg border border-[#dbe0e6] bg-white p-4 flex-col">
                <div className="text-[#111418]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M229.66,109.66l-48,48a8,8,0,0,1-11.32-11.32L204.69,112H165a88,88,0,0,0-85.23,66,8,8,0,0,1-15.5-4A103.94,103.94,0,0,1,165,96h39.71L170.34,61.66a8,8,0,0,1,11.32-11.32l48,48A8,8,0,0,1,229.66,109.66ZM192,208H40V88a8,8,0,0,0-16,0V208a16,16,0,0,0,16,16H192a8,8,0,0,0,0-16Z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-[#111418] text-base font-bold leading-tight">Sharing and Exporting</h2>
                  <p className="text-[#60758a] text-sm font-normal leading-normal">Share your diagrams with others or export them in various formats.</p>
                </div>
              </div>
            </div>
            
            {/* FAQ */}
            <h2 className="text-[#111418] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Frequently Asked Questions</h2>
            <div className="flex flex-col p-4 gap-3">
              {faqs.map((faq, index) => (
                <details 
                  key={index}
                  className="flex flex-col rounded-lg border border-[#dbe0e6] bg-white px-[15px] py-[7px] group"
                  open={openFAQs.has(index)}
                >
                  <summary 
                    className="flex cursor-pointer items-center justify-between gap-6 py-2"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFAQ(index);
                    }}
                  >
                    <p className="text-[#111418] text-sm font-medium leading-normal">{faq.question}</p>
                    <div className={`text-[#111418] transition-transform ${openFAQs.has(index) ? 'rotate-180' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
                      </svg>
                    </div>
                  </summary>
                  {openFAQs.has(index) && (
                    <p className="text-[#60758a] text-sm font-normal leading-normal pb-2">{faq.answer}</p>
                  )}
                </details>
              ))}
            </div>
            
            {/* Contact Support */}
            <h2 className="text-[#111418] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Contact Support</h2>
            <p className="text-[#111418] text-base font-normal leading-normal pb-3 pt-1 px-4">
              If you couldn't find the answer you were looking for, please don't hesitate to reach out to our support team. We're here to help!
            </p>
            <div className="flex px-4 py-3 justify-start">
              <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0d80f2] text-white text-sm font-bold leading-normal tracking-[0.015em]">
                <span className="truncate">Contact Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
