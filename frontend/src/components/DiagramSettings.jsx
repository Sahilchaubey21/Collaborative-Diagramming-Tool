import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';

const DiagramSettings = () => {
  const [theme, setTheme] = useState('light');
  const [font, setFont] = useState('Inter');
  const [colorPalette, setColorPalette] = useState('default');
  const [fileFormat, setFileFormat] = useState('png');
  const [inviteEmails, setInviteEmails] = useState('');

  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-white group/design-root overflow-x-hidden"
      style={{
        '--select-button-svg': 'url(\'data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724px%27 height=%2724px%27 fill=%27rgb(96,117,138)%27 viewBox=%270 0 256 256%27%3e%3cpath d=%27M181.66,170.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-48-48a8,8,0,0,1,11.32-11.32L128,212.69l42.34-42.35A8,8,0,0,1,181.66,170.34Zm-96-84.68L128,43.31l42.34,42.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,85.66Z%27%3e%3c/path%3e%3c/svg%3e\')',
        fontFamily: 'Inter, "Noto Sans", sans-serif'
      }}
    >
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-[512px] max-w-[512px] py-5 max-w-[960px] flex-1">
            <h2 className="text-[#111418] tracking-light text-[28px] font-bold leading-tight px-4 text-left pb-3 pt-5">Diagram Settings</h2>
            
            {/* Appearance */}
            <h3 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Appearance</h3>
            <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
              <label className="flex flex-col min-w-40 flex-1">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Theme</p>
                <select
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border border-[#dbe0e6] bg-white focus:border-[#dbe0e6] h-14 bg-[image:--select-button-svg] placeholder:text-[#60758a] p-[15px] text-base font-normal leading-normal"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </label>
            </div>
            
            <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
              <label className="flex flex-col min-w-40 flex-1">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Font</p>
                <select
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border border-[#dbe0e6] bg-white focus:border-[#dbe0e6] h-14 bg-[image:--select-button-svg] placeholder:text-[#60758a] p-[15px] text-base font-normal leading-normal"
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                >
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </label>
            </div>
            
            <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
              <label className="flex flex-col min-w-40 flex-1">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Color Palette</p>
                <select
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border border-[#dbe0e6] bg-white focus:border-[#dbe0e6] h-14 bg-[image:--select-button-svg] placeholder:text-[#60758a] p-[15px] text-base font-normal leading-normal"
                  value={colorPalette}
                  onChange={(e) => setColorPalette(e.target.value)}
                >
                  <option value="default">Default</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="pastel">Pastel</option>
                </select>
              </label>
            </div>
            
            {/* Collaborators */}
            <h3 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Collaborators</h3>
            <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
              <label className="flex flex-col min-w-40 flex-1">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Invite Collaborators</p>
                <input
                  placeholder="Enter email addresses"
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border border-[#dbe0e6] bg-white focus:border-[#dbe0e6] h-14 placeholder:text-[#60758a] p-[15px] text-base font-normal leading-normal"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                />
              </label>
            </div>
            
            {/* Current Collaborators */}
            <div className="flex items-center px-4 py-3 justify-start">
              <div className="overflow-visible w-7">
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover border-white bg-[#f0f2f5] text-[#60758a] rounded-full flex items-center justify-center size-9 border-[3px]"
                  style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAOe_bHBbvI_mQDdT4Nlz_MMrorZtFbt0J3JlnXMPQmxuTFe2rrk-EMo6WCTdrALVZlqcaUFzIYdBy3kDCXRzh3ohQfUMVo03zQo4bk_8YYCdn3juRgoIFl3otTtpojb3vGzRHTJRfuW8ZdaErUW4rlrDSV29B-g92ItysPvs5HifPX030H7T6QQn07TdSkxCmiz8ZuPUQuxicOgZzVGOST2aZaS6NpyyKU9YASoqpPoqpijI6gG6jmqD_xCoG3h2Ry2FUteV1I4y-d")'}}
                />
              </div>
              <div className="overflow-visible w-7">
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover border-white bg-[#f0f2f5] text-[#60758a] rounded-full flex items-center justify-center size-9 border-[3px]"
                  style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuApKv8ZpgQE12qSFR5kAS3hFhuCd28i2h9ah6rgZgR9pnLS3iNhy3lklxzVG7QfV4leIabp27QfiLYRTy0zhrQTxe4vn_RgPDsMCmeInytI9-2ztNs8v1XYQEmlAJdlg852xTymo2qKIBm-U6lw6cgKaktRkBtAveVTR032R20xGkdi-EmDj6PVpswT0IJl6empzcIadDsD6cvhFTav74L6BsV1htEKQVSfchAkBXTYJZhvUhfSRNOrR3EDlPwoqh46t_F59Pi6dtI2")'}}
                />
              </div>
              <div className="overflow-visible w-9">
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover border-white bg-[#f0f2f5] text-[#60758a] rounded-full flex items-center justify-center size-9 border-[3px]"
                  style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCReoWMgt9NVdR0cYZgQRZBblb973DJpxYdM5UfMsoE77tW6FBjBSjADnvcjWx8VOBtg9ISC9nVqiXcTS-nScR1urxFwAz2HPvcvVXMHG06CO2EDAOuOVMe9Wo6hyBT6JfeKRC_LaWc3VPMru-RpA0rPFEKyGkPnNsy6Are3pqXyvenbBasQVJ6AhlkIiB_kPj1NtlGIrBA1T4m0XKTqAeoCEf8cKLztkyLlNddMI07Wb23vA13SzxsZRkcu_278PiVw-FOj9jnuGU9")'}}
                />
              </div>
            </div>
            
            {/* Export */}
            <h3 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Export</h3>
            <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
              <label className="flex flex-col min-w-40 flex-1">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">File Format</p>
                <select
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border border-[#dbe0e6] bg-white focus:border-[#dbe0e6] h-14 bg-[image:--select-button-svg] placeholder:text-[#60758a] p-[15px] text-base font-normal leading-normal"
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="svg">SVG</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
            </div>
            
            <div className="flex px-4 py-3 justify-end">
              <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0d80f2] text-white text-sm font-bold leading-normal tracking-[0.015em]">
                <span className="truncate">Export Diagram</span>
              </button>
            </div>
            
            <div className="flex px-4 py-3 justify-start">
              <Link
                to="/my-diagrams"
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f0f2f5] text-[#111418] text-sm font-bold leading-normal tracking-[0.015em]"
              >
                <span className="truncate">Back to Diagrams</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramSettings;
