import setuptools
from glob import glob
import fnmatch
import os
from setuptools.command.install import install
import fileinput

#This block copies resources to the server (/usr/local/share/jupyter/nbextensions/)
data_files = []
for root, dirnames, filenames in os.walk('src/geppettoJupyter/geppetto/src/main/webapp/css/'):
    for filename in fnmatch.filter(filenames, '*'):
        data_files.append(('share/jupyter/nbextensions' + root[3:].replace("src/main/webapp/", ""), [os.path.join(root, filename)]))
for root, dirnames, filenames in os.walk('src/geppettoJupyter/geppetto/src/main/webapp/less/'):
    for filename in fnmatch.filter(filenames, '*'):
        data_files.append(('share/jupyter/nbextensions' + root[3:].replace("src/main/webapp/", ""), [os.path.join(root, filename)]))
for root, dirnames, filenames in os.walk('src/geppettoJupyter/geppetto/src/main/webapp/images/'):
    for filename in fnmatch.filter(filenames, '*'):
        data_files.append(('share/jupyter/nbextensions' + root[3:].replace("src/main/webapp/", ""), [os.path.join(root, filename)]))
for root, dirnames, filenames in os.walk('src/geppettoJupyter/geppetto/src/main/webapp/js/'):
    for filename in fnmatch.filter(filenames, '*'):
        data_files.append(('share/jupyter/nbextensions' + root[3:].replace("src/main/webapp/", ""), [os.path.join(root, filename)]))

data_files.append(('share/jupyter/nbextensions/geppettoJupyter', glob('src/geppettoJupyter/*.js')))
data_files.append(('share/jupyter/nbextensions/geppettoJupyter', glob('src/geppettoJupyter/*.css')))

class CustomInstallCommand(install):
    user_options = install.user_options + [
        ('jupyter-notebook-path=', None, 'Path to jupyter notebook')
    ]

    def initialize_options(self):
        install.initialize_options(self)
        self.jupyter_notebook_path = None

    def finalize_options(self):
        install.finalize_options(self)
        
    def run(self):
        print("kaky")
        print(self.jupyter_notebook_path)
        
        if self.jupyter_notebook_path == None:
            self.jupyter_notebook_path = "'http://localhost:8888/notebooks/Untitled.ipynb?kernel_name=python3'";
        
        folderPath = 'src/geppettoJupyter/geppetto/src/main/webapp/extensions/geppetto-neuron'
        componentsInitialization = 'ComponentsInitialization.js'
        for line in fileinput.input(os.path.join(folderPath, componentsInitialization), inplace=True):
            if 'var pythonNotebookPath' in line:
                print('var pythonNotebookPath = ' + self.jupyter_notebook_path + ';') 
            else:
                print(line)    
        
        install.run(self)
        #self.do_egg_install()

#raise AttributeError(data_files) For debug purposes

setuptools.setup(
    name="geppettoJupyter",
    cmdclass={
        'install': CustomInstallCommand,
    },
    version='0.1.0',
    url="http://geppetto.org",
    author="Adrian Quintana",
    description="Geppetto",
    long_description=open('README.md').read(),
    packages=setuptools.find_packages('src'),
    package_dir={'': 'src'},
    data_files=data_files,
    include_package_data=True,
)