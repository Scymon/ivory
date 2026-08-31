import { getFileType } from './file-types.js';

const fileTree=document.querySelector<HTMLElement>('#file-tree'),tabBar=document.querySelector<HTMLElement>('#tab-bar'),editorHost=document.querySelector<HTMLElement>('#editor-host'),readingHost=document.querySelector<HTMLElement>('#reading-host'),welcome=document.querySelector<HTMLElement>('#welcome');
if(!fileTree||!tabBar||!editorHost||!readingHost||!welcome)throw new Error('Workspace router could not find the Ivory workspace.');
const canvasHost=()=>document.querySelector<HTMLElement>('.canvas-host');
const imageHost=()=>document.querySelector<HTMLElement>('.image-viewer-host');
const baseHost=()=>document.querySelector<HTMLElement>('.bases-host');
function deactivateCanvas(){canvasHost()?.classList.add('hidden');document.querySelector<HTMLElement>('.canvas-tab')?.classList.remove('active');}
function deactivateImage(){imageHost()?.classList.add('hidden');document.querySelector<HTMLElement>('.image-viewer-tab')?.classList.remove('active');}
function deactivateBase(){baseHost()?.classList.add('hidden');window.dispatchEvent(new CustomEvent('ivory:hide-base'));}
function prepareMarkdown(){deactivateCanvas();deactivateImage();deactivateBase();}
function prepareCanvas(){deactivateImage();deactivateBase();editorHost.classList.add('hidden');readingHost.classList.add('hidden');welcome.classList.add('hidden');}
function prepareImage(){deactivateCanvas();deactivateBase();editorHost.classList.add('hidden');readingHost.classList.add('hidden');welcome.classList.add('hidden');}
function prepareBase(){deactivateCanvas();deactivateImage();editorHost.classList.add('hidden');readingHost.classList.add('hidden');welcome.classList.add('hidden');window.dispatchEvent(new CustomEvent('ivory:show-base'));}
fileTree.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file');if(!button)return;const path=button.dataset.path||button.textContent?.trim()||'',type=getFileType(path);if(type==='markdown')prepareMarkdown();else if(type==='canvas')prepareCanvas();else if(type==='image')prepareImage();else if(type==='base')prepareBase();},true);
tabBar.addEventListener('click',event=>{const tab=(event.target as HTMLElement).closest<HTMLElement>('.tab');if(!tab)return;const kind=tab.dataset.tabKind;if(kind==='base'){prepareBase();return;}if(tab.classList.contains('canvas-tab')||kind==='canvas'){prepareCanvas();return;}if(tab.classList.contains('image-viewer-tab')||kind==='image'){prepareImage();return;}if(!tab.classList.contains('welcome-tab'))prepareMarkdown();},true);
window.addEventListener('ivory:show-markdown',prepareMarkdown);window.addEventListener('ivory:show-canvas',prepareCanvas);window.addEventListener('ivory:show-image',prepareImage);window.addEventListener('ivory:show-base',prepareBase);
