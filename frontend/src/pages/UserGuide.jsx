import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Shield, Users, UserCheck, GraduationCap, Calculator, Menu, X, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

const MODULES = [
  { id: 'home', title: 'Introduction', icon: BookOpen },
  { id: 'super-admin', title: 'Super Admin Guide', icon: Shield },
  { id: 'admin', title: 'Admin Guide', icon: Users },
  { id: 'teacher', title: 'Teacher Guide', icon: UserCheck },
  { id: 'student', title: 'Student Guide', icon: GraduationCap },
  { id: 'accounts', title: 'Accounts Guide', icon: Calculator },
];

const UserGuide = () => {
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const [markdown, setMarkdown] = useState('');
  const [toc, setToc] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('userGuideTheme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      localStorage.setItem('userGuideTheme', 'dark');
    } else {
      localStorage.setItem('userGuideTheme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const response = await fetch(`/docs/${activeModule}.md`);
        if (!response.ok) throw new Error('Failed to load documentation');
        const text = await response.text();
        setMarkdown(text);
        
        // Generate TOC
        const headings = [];
        const lines = text.split('\n');
        lines.forEach(line => {
          const match = line.match(/^(#{2,3})\s+(.*)/);
          if (match) {
            const level = match[1].length;
            const text = match[2];
            const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
            headings.push({ level, text, id });
          }
        });
        setToc(headings);
      } catch (error) {
        console.error('Error fetching doc:', error);
        setMarkdown('# Error\nFailed to load documentation. Please try again later.');
        setToc([]);
      }
    };
    
    fetchDoc();
  }, [activeModule]);

  // Extract text recursively from React children to build id
  const extractText = (children) => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractText).join('');
    if (children && children.props && children.props.children) {
      return extractText(children.props.children);
    }
    return '';
  };

  const MarkdownComponents = {
    h2: ({node, ...props}) => {
      const text = extractText(props.children);
      const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
      return <h2 id={id} className="scroll-mt-24" {...props} />;
    },
    h3: ({node, ...props}) => {
      const text = extractText(props.children);
      const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
      return <h3 id={id} className="scroll-mt-24" {...props} />;
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans`}>
      <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        {/* Mobile Sidebar Toggle & Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-between px-4 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-semibold text-gray-900 dark:text-white">User Guide</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Left Sidebar (Modules) */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-72 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}>
          <div className="h-16 hidden lg:flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1 -ml-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">User Guide</h1>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6 px-4 lg:pt-6 pt-20 custom-scrollbar">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Modules</div>
              {MODULES.map(module => (
                <button
                  key={module.id}
                  onClick={() => {
                    setActiveModule(module.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${activeModule === module.id 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'}
                  `}
                >
                  <module.icon className={`w-5 h-5 ${activeModule === module.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  {module.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0 scroll-smooth">
          <div className="max-w-3xl mx-auto px-6 lg:px-12 py-10 lg:py-16">
            <div className="prose prose-blue dark:prose-invert prose-lg max-w-none transition-colors duration-200">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Table of Contents) */}
        <div className="hidden xl:block w-72 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto transition-colors duration-200">
          <div className="p-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">On this page</h4>
            {toc.length > 0 ? (
              <nav className="space-y-1.5">
                {toc.map((heading, index) => (
                  <a
                    key={index}
                    href={`#${heading.id}`}
                    className={`
                      block text-sm transition-colors
                      ${heading.level === 2 
                        ? 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium mt-3' 
                        : 'text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 pl-4'}
                    `}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No sections available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
