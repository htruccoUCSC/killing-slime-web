# Devlog #1: How We Used Perforce's P4 For A Student Project

**Date:** June 3, 2026  
**Author:** Sonny Trucco

## Why We Switched

Like most personal and student projects, *Killing Slime* started out using Git hosted on GitHub for version control. While Git is a great version control option, it has weaknesses that are exceedingly noticeable in the space of game development. Git struggles with versioning large binary assets because it is designed to store full file snapshots over time. While this works for small, text-based code files, tiny changes to massive binary files (like 3D models, textures, or Unity scenes) cause the repository's historical data to bloat exponentially. Git does offer a solution to this in the form of Git LFS (Large File Storage). LFS turns large files into pointers and stores them outside of your main repository, only pulling them when a new copy is needed. However, when using it on GitHub, there are bandwidth and storage rate limits applied to free accounts that we eventually exceeded.

Another issue we ran into was our team's general inexperience with Unity and Git. For many team members, this project was their first time using Unity, and their first time using Unity with Git by extension. This led to numerous Unity scene and prefab merge conflicts. While these can be resolved, it is much easier if they never happen in the first place.

Once these two factors became clear, I decided we needed to change our version control system. After doing some research and asking industry experts at GDC, I settled on Perforce P4 as the solution to our problem. With P4, we would host the server ourselves, avoiding GitHub's LFS rate limits. We would also have access to file locking, preventing two developers from making concurrent changes to a file that would be difficult to merge.

## How to Set Up P4

Unfortunately, setting up P4 is not as simple as going to GitHub and clicking the "New Repository" button. To set up P4, you have to host it yourself. You can host P4 locally, pay Perforce to host it for you, or use a cloud compute provider. We chose to host P4 using Amazon Web Services (AWS), which is the process I will detail below. If you would like to follow along, you will need:

- An AWS Account with a credit card attached
- ~2 hours of time

### Costs

It's important to note that hosting on AWS theoretically costs money, but in practice as a student you can stack up to $400 of AWS credits just for signing up for AWS and other student developer benefits. We were able to host P4 and a CI/CD pipeline for the duration of our project entirely for free.

### How to Deploy on AWS

#### Step 1: Choosing a Region

In the interest of saving on monthly compute, I highly recommend choosing from the following three regions:

- us-east-1
- us-east-2
- us-west-2

Since my team was based in California, we chose `us-west-2`, but you should choose whichever region is closest to you. You can select your region in the top-right corner of the AWS Console.

![AWS Region Select](../assets/AWSTutorial1.png)

#### Step 2: Creating a Key Pair

On AWS, you will need an RSA key pair to be able to access your P4 server. To create one:

1. From the AWS Console, search for "EC2" and select the EC2 dashboard.
2. On the left-hand EC2 menu, select **Key Pairs** under **Network & Security**.  
![EC2 Network & Security](../assets/AWSTutorial2.png)
3. In the top-right corner, select **Create key pair**.
4. Enter a descriptive name like `MyGameP4KeyPair`.
5. Choose **RSA** for the key pair type.
6. Choose **.pem** for the private key file format.
7. Click **Create key pair** and store the downloaded file somewhere safe and secure.

#### Step 3: Subscribing to P4 on AWS

1. Visit the [Perforce Helix Core AWS Marketplace page](https://aws.amazon.com/marketplace/pp/prodview-nw7wxff425so4).
2. Click **View Purchase Options**.  
*Note: P4 is free for up to 5 users and 20 workspaces, which is very manageable for a student team.*
3. Read and accept the Terms and Conditions.
4. Click **Continue to Configuration**.
5. Choose the default **Fulfillment option**, the most recent **Software Version**, and the same **Region** you chose earlier.
6. Choose **Continue to Launch**.
7. Choose **Launch CloudFormation**.

#### Step 4: Creating a Stack

In this section, we will create the server hosting our P4 depot. There are a lot of options to configure, but if you are a student, you will most likely want to choose the recommended settings below.

1. On the first page ("Create stack"), do not change anything; simply click **Next**.
2. Provide a descriptive stack name like `MyGameName-P4`.
3. Fill out the following parameters:

#### Security and Networking

| Parameter | Recommendation |
| --- | ----------- |
| Public/Private Key Pair | The key pair created in Step 2 |
| Security Group Selection | Create New Security Group |
| - Existing Security Group ID | Leave blank |
| Your Public IP address | Leave blank unless you want to restrict connections to a specific IP |
| Subnet Options | Create New VPC and Subnet |
| - Existing Subnet ID | Leave blank |
| - Existing VPC ID | Leave blank |

#### Instance Configuration

| Parameter | Recommendation |
| --- | ----------- |
| Instance Type | `t3.small`* |
| Case Sensitivity | `sensitive` (unless the entire team is using windows exclusively) |
| P4 Auth ID | A descriptive name like `my-game-name-p4-server` |

*In theory, a student team would not need an instance this big, but the AWS marketplace template does not support smaller instances.

#### Depot Volume

The next three sections configure storage for the server. The recommendations represent the cheapest and smallest configuration for a small student game. If your game is larger, consider increasing the storage sizes.

| Parameter | Recommendation |
| --- | ----------- |
| Depot Volume Type | `st1` (for a cheaper HDD) |
| Depot Volume Size | 128 |
| Depot Provisioned IOPS | 3000 |
| Depot Throughput (MB/s) | 125 |

#### Metadata (Database) Volume

| Parameter | Recommendation |
| --- | ----------- |
| Metadata Volume Type | `gp3` |
| Metadata Volume Size (GiB) | 16 |
| Metadata Provisioned IOPS | 3000 |
| Metadata Throughput (MB/s) | 125 |

#### Log Volume

| Parameter | Recommendation |
| --- | ----------- |
| Log Volume Type | `gp3` |
| Log Volume Size (GiB) | 16 |
| Log Provisioned IOPS | 3000 |
| Log Throughput (MB/s) | 125 |

#### Tags and Labels

| Parameter | Recommendation |
| --- | ----------- |
| Prefix for all resources | An acronym or shortened version of your game's name |
| Environment Label (e.g., dev, test, prod) | dev |
| Owner (Optional) | Your name or team's name |
| Notification Email (Optional) | Your email or team's email |

#### Backup Settings

| Parameter | Recommendation |
| --- | ----------- |
| Enable Backups? | true |
| Backup Retention (days) | 30 |

#### Advanced Options

Do not modify these settings.

#### Step 5: Deploying the Stack

1. Select **Next** at the bottom of the **Specify Stack Details** page.
2. On the **Configure stack options** page, in the **Capabilities** section, check the box to acknowledge the required capabilities.
3. Click **Next**.
4. On the **Review and Create** page, review your parameters and click **Submit** to begin deployment.
5. Wait about five minutes for the deployment to complete and the stack status to update to **CREATE_COMPLETE**.

#### Step 6: Deployment Outputs & P4 Credentials

After the deployment completes, note down three important values from the **Outputs** tab of the stack:

| Value | Definition |
| --- | ----------- |
| HelixCoreInstanceID | Instance ID for the new P4 EC2 instance |
| PerforcePrivateIP | Private IP address for P4 Server |
| PerforcePublicIP | Public IP address for P4 Server |

These values help determine the login credentials for your P4 server:

| Value | Format |
| --- | ----------- |
| Server | `ssl:PerforcePublicIP:1666` |
| User | `perforce` |
| Password | The `HelixCoreInstanceID` noted above |

### Downloading P4V

P4V is the application we will use to interface with our P4 server and manage files.

1. Visit the [P4V download page](https://portal.perforce.com/s/downloads?product=Helix%20Visual%20Client%20%28P4V%29).
2. Select your OS in the **Family** dropdown.
3. Click **Download**.
4. Install P4V as you would any other application on your platform, and input the credentials noted down earlier when prompted.

### Configuring Security

Security configurations are essential to ensure unauthorized users cannot access your server. To make these changes, you must access P4Admin via P4V after connecting to the server using the `perforce` account.

#### Setting the Server Security Level

1. Open P4V.
2. Under the **Tools** menu, select **Administration** to open P4Admin.
3. In P4Admin, select the **Configurables** tab.
4. Double-click the **security** entry to open the config dialog box.  
![security box in Configurables tab](../assets/P4AdminTutorial1.png)
5. Ensure the value is set to **4**. If not, type `4` in the new value field.
6. Click **Set** if the value needed to be updated.

#### Changing the Super User Password

1. Open P4V.
2. In P4V, open the **Connection** menu and click **Change Password...**.
3. In the dialog box, enter the old password, then enter a new password that is at least eight characters long, contains both uppercase and lowercase letters, and includes one or more special characters or numbers.
4. Confirm the new password and click **OK**.

#### Changing Other Security Configurables

Other configurable values in the **Configurables** tab should also be set to specific values to ensure the security of the server. Double-check these settings to ensure they match:

1. Open P4V.
2. Under the **Tools** menu, click **Administration** to open P4Admin.
3. In P4Admin, open the **Configurables** tab.
4. Check the value of each configurable in the list below. If it does not match, double-click to update it:

| Configurable Name | Value | Description |
| -------- | --- | -------------------- |
| dm.user.noautocreate | 2 | Prevents automatic user creation. Only you, as the administrator, should create accounts for team members. |
| dm.user.setinitialpasswd | 0 | Ensures that only super users can set initial passwords for other users. |
| dm.user.resetpassword | 1 | Forces new users to reset their password on their initial login. |
| dm.info.hide | 1 | Hides server version information from unauthorized users. |
| dm.user.hideinvalid | 1 | Hides whether an authentication failure is due to an incorrect username. |
| run.users.authorize | 1 | Hides user details from unauthenticated users. |

#### Configuring Typemap Settings

The typemap is one of the biggest benefits of Helix Core. It is a configuration that tells the server how to version specific file types. If you are using a game engine, it is critical to configure the typemap to ensure binary assets are locked (exclusive checkout) so they can only be edited by one person at a time.

1. Open a command prompt or terminal, enter the command `p4 typemap`, and press **Enter**.
2. The typemap specification will open in the default text editor you specified during P4V installation.
3. If you are using a game engine like Unity, Unreal, or Godot, paste in the **Universal Game Engine Typemap** below. Otherwise, research how to write a custom typemap suited to your project's file types.
4. After writing or pasting the typemap, save and close the file.

<details>
  <summary>Universal Game Engine Typemap</summary>

```text
# Perforce File Type Mapping Specifications.
#
#  TypeMap:    a list of filetype mappings; one per line.
#        Each line has two elements:
#
#          Filetype: The filetype to use on 'p4 add'.
#
#          Path:     File pattern which will use this filetype.
#
# See 'p4 help typemap' for more information.

TypeMap:
    text+l      //....md5anim     ## Unity3D files that should be locked
    text+l      //....md5mesh     ## Unity3D files that should be locked
    text+l      //....meta        ## Unity3D files that should be locked

    text+w      //....config      ## Auto-updated files - reconcile offline work carefully
    text+w      //....deps.json   ## Auto-updated files - reconcile offline work carefully
    text+w      //....DotSettings  ## Auto-updated files - reconcile offline work carefully
    text+w      //....ini         ## Auto-updated files - reconcile offline work carefully
    text+w      //....json        ## Auto-updated files - reconcile offline work carefully
    text+w      //....log         ## Auto-updated files - reconcile offline work carefully
    text+w      //....modules     ## Auto-updated files - reconcile offline work carefully
    text+w      //....pdm         ## Auto-updated files - reconcile offline work carefully
    text+w      //....runtimeconfig.json    ## Auto-updated files - reconcile offline work carefully
    text+w      //....target      ## Auto-updated files - reconcile offline work carefully
    text+w      //....uatbuildrecord ## Auto-updated files - reconcile offline work carefully
    text+w      //....uproject    ## Auto-updated files - reconcile offline work carefully
    text+w      //....version     ## Auto-updated files - reconcile offline work carefully
    text+w      //....xml         ## Auto-updated files - reconcile offline work carefully
    

    binary+Fl   //....avi         ## Already compressed - store uncompressed and lock
    binary+Fl   //....bz2         ## Already compressed - store uncompressed and lock
    binary+Fl   //....gif         ## Already compressed - store uncompressed and lock
    binary+Fl   //....gz          ## Already compressed - store uncompressed and lock
    binary+Fl   //....jar         ## Already compressed - store uncompressed and lock
    binary+Fl   //....jpeg        ## Already compressed - store uncompressed and lock
    binary+Fl   //....jpg         ## Already compressed - store uncompressed and lock
    binary+Fl   //....mov         ## Already compressed - store uncompressed and lock
    binary+Fl   //....mpg         ## Already compressed - store uncompressed and lock
    binary+Fl   //....rar         ## Already compressed - store uncompressed and lock
    binary+Fl   //....tif         ## Already compressed - store uncompressed and lock
    binary+Fl   //....tiff        ## Already compressed - store uncompressed and lock
    binary+Fl   //....zip         ## Already compressed - store uncompressed and lock

    binary+l   //....a           ## Standard binary - store compressed and lock
    binary+l   //....aac         ## Standard binary - store compressed and lock
    binary+l   //....aar         ## Standard binary - store compressed and lock
    binary+l   //....aas         ## Standard binary - store compressed and lock
    binary+l   //....ae          ## Standard binary - store compressed and lock
    binary+l   //....ai          ## Standard binary - store compressed and lock
    binary+l   //....aiff        ## Standard binary - store compressed and lock
    binary+l   //....anim        ## Standard binary - store compressed and lock
    binary+l   //....apk         ## Standard binary - store compressed and lock
    binary+l   //....asset       ## Standard binary - store compressed and lock
    binary+l   //....bik         ## Standard binary - store compressed and lock
    binary+l   //....bin         ## Standard binary - store compressed and lock
    binary+l   //....blend       ## Standard binary - store compressed and lock
    binary+l   //....bmp         ## Standard binary - store compressed and lock
    binary+l   //....bnk         ## Standard binary - store compressed and lock
    binary+l   //....btr         ## Standard binary - store compressed and lock
    binary+l   //....celtx       ## Standard binary - store compressed and lock
    binary+l   //....cfm         ## Standard binary - store compressed and lock
    binary+l   //....class       ## Standard binary - store compressed and lock
    binary+l   //....clip        ## Standard binary - store compressed and lock
    binary+l   //....controller  ## Standard binary - store compressed and lock
    binary+l   //....cubemap     ## Standard binary - store compressed and lock
    binary+l   //....dae         ## Standard binary - store compressed and lock
    binary+l   //....data        ## Standard binary - store compressed and lock
    binary+l   //....dds         ## Standard binary - store compressed and lock
    binary+l   //....demo        ## Standard binary - store compressed and lock
    binary+l   //....doc         ## Standard binary - store compressed and lock
    binary+l   //....docx        ## Standard binary - store compressed and lock
    binary+l   //....dot         ## Standard binary - store compressed and lock
    binary+l   //....ear         ## Standard binary - store compressed and lock
    binary+l   //....fbx         ## Standard binary - store compressed and lock
    binary+l   //....flac        ## Standard binary - store compressed and lock
    binary+l   //....fnt         ## Standard binary - store compressed and lock
    binary+l   //....ibl         ## Standard binary - store compressed and lock
    binary+l   //....ico         ## Standard binary - store compressed and lock
    binary+l   //....ip          ## Standard binary - store compressed and lock
    binary+l   //....light       ## Standard binary - store compressed and lock
    binary+l   //....lighting    ## Standard binary - store compressed and lock
    binary+l   //....lwo         ## Standard binary - store compressed and lock
    binary+l   //....m4a         ## Standard binary - store compressed and lock
    binary+l   //....ma          ## Standard binary - store compressed and lock
    binary+l   //....mask        ## Standard binary - store compressed and lock
    binary+l   //....mat         ## Standard binary - store compressed and lock
    binary+l   //....mb          ## Standard binary - store compressed and lock
    binary+l   //....mp3         ## Standard binary - store compressed and lock
    binary+l   //....mp4         ## Standard binary - store compressed and lock
    binary+l   //....navmesh     ## Standard binary - store compressed and lock
    binary+l   //....obj         ## Standard binary - store compressed and lock
    binary+l   //....odg         ## Standard binary - store compressed and lock
    binary+l   //....odp         ## Standard binary - store compressed and lock
    binary+l   //....ods         ## Standard binary - store compressed and lock
    binary+l   //....odt         ## Standard binary - store compressed and lock
    binary+l   //....ogg         ## Standard binary - store compressed and lock
    binary+l   //....otf         ## Standard binary - store compressed and lock
    binary+l   //....otg         ## Standard binary - store compressed and lock
    binary+l   //....ots         ## Standard binary - store compressed and lock
    binary+l   //....ott         ## Standard binary - store compressed and lock
    binary+l   //....overrideController ## Standard binary - store compressed and lock
    binary+l   //....pac         ## Standard binary - store compressed and lock
    binary+l   //....pdf         ## Standard binary - store compressed and lock
    binary+l   //....physicMaterial ## Standard binary - store compressed and lock
    binary+l   //....png         ## Standard binary - store compressed and lock
    binary+l   //....ppt         ## Standard binary - store compressed and lock
    binary+l   //....pptx        ## Standard binary - store compressed and lock
    binary+l   //....prefab      ## Standard binary - store compressed and lock
    binary+l   //....prefab.unity ## Standard binary - store compressed and lock
    binary+l   //....psb         ## Standard binary - store compressed and lock
    binary+l   //....psd         ## Standard binary - store compressed and lock
    binary+l   //....raw         ## Standard binary - store compressed and lock
    binary+l   //....renderTexture ## Standard binary - store compressed and lock
    binary+l   //....res         ## Standard binary - store compressed and lock
    binary+l   //....response    ## Standard binary - store compressed and lock
    binary+l   //....roq         ## Standard binary - store compressed and lock
    binary+l   //....rpt         ## Standard binary - store compressed and lock
    binary+l   //....shadow      ## Standard binary - store compressed and lock
    binary+l   //....skp         ## Standard binary - store compressed and lock
    binary+l   //....so          ## Standard binary - store compressed and lock
    binary+l   //....sxw         ## Standard binary - store compressed and lock
    binary+l   //....tar         ## Standard binary - store compressed and lock
    binary+l   //....terrain     ## Standard binary - store compressed and lock
    binary+l   //....tga         ## Standard binary - store compressed and lock
    binary+l   //....tres        ## Standard binary - store compressed and lock
    binary+l   //....ttf         ## Standard binary - store compressed and lock
    binary+l   //....u           ## Standard binary - store compressed and lock
    binary+l   //....uasset      ## Standard binary - store compressed and lock
    binary+l   //....udk         ## Standard binary - store compressed and lock
    binary+l   //....umap        ## Standard binary - store compressed and lock
    binary+l   //....unity       ## Standard binary - store compressed and lock
    binary+l   //....unitypackage ## Standard binary - store compressed and lock
    binary+l   //....upk         ## Standard binary - store compressed and lock
    binary+l   //....war         ## Standard binary - store compressed and lock
    binary+l   //....wav         ## Standard binary - store compressed and lock
    binary+l   //....webm        ## Standard binary - store compressed and lock
    binary+l   //....wma         ## Standard binary - store compressed and lock
    binary+l   //....wmv         ## Standard binary - store compressed and lock
    binary+l   //....xls         ## Standard binary - store compressed and lock
    binary+l   //....xlsx        ## Standard binary - store compressed and lock

    binary+w   //....app         ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....dll         ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....dylib       ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....exe         ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....exp         ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....ipa         ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....lib         ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....pdb         ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....rc          ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....stub        ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....ubulk       ## Build output - stays writable, be sure to reconcile offline work
    binary+w   //....uexp        ## Build output - stays writable, be sure to reconcile offline work
    
    text+x    //....sh          ## Make executable for mac and linux
    text+x    //....command     ## Make executable for mac

    binary+wS2  //..._BuiltData.uasset  ## Large regenerable files - keep 2 versions, be sure to reconcile offline work
```

</details>

### Creating a Stream Depot

A depot is the highest-level bucket in P4, functioning similarly to a repository in Git. Streams in P4 are like branches in Git, allowing developers to create separate channels to work on the project. To create a stream depot:

1. Open P4V.
2. Select **Tools** > **Administration** to open P4Admin.
3. In P4Admin, select the **Depots** tab.
4. Right-click the generic `depot` entry and delete it.
5. Select **File** > **New** > **Depot**.  
![depot creation in P4Admin](../assets/P4AdminTutorial2.png)
6. Name the depot after your project.
7. Click **OK**.
8. In the next dialog box, ensure the **Depot type** is set to **stream**.
9. Add a description to the depot.
10. Click **OK** to create the depot.

### Creating a Main Stream

Streams are the primary way of managing branching and workflows in P4. Every project needs a top-level mainline stream; beyond that, creating other streams is at the user's discretion. To create a main stream:

1. In P4V, select the **View** menu and click **Stream Graph** (or press `Alt` + `7`). A **Stream Graph** window will appear in the right-hand panel.  
![stream graph in view tab](../assets/P4VTutorial1.png)
2. Right-click anywhere inside the **Stream Graph** window and choose **New Stream...**.
3. Establish a stream naming convention for your game. For example, we shortened *Killing Slime* to `KS` and named our streams `KS_streamName`, so this mainline stream was named `KS_main`.
4. In the **Stream type** field, select **mainline**.
5. In the **Depot** field, click **Browse...**, select the depot you created earlier, and click **OK**.
6. Enter a description for the stream.
7. Ensure all options in the dialog are configured correctly (e.g., checking or unchecking specific options like importing files).  
![checkboxes](../assets/P4VTutorial2.png)
8. Click **OK** to create the stream.

### Creating a Workspace

In P4, a workspace is a directory on your local machine that maps to a copy of a stream. Developers make changes locally and submit them back to the stream from their workspaces. To create a workspace:

1. In the **Stream Graph** window, right-click the main stream you just created and select **New Workspace...**.
2. Enter a **Workspace name** following a clear pattern, such as `username_computerName_projectName`.
3. Set the **Workspace root** to the directory on your computer where project files should be stored.
4. In the **Advanced** tab under **File Options**, select **Modtime**, **Rmdir**, and **Revert unchanged files**.  
![file options](../assets/P4VTutorial3.png)
5. Select **Switch to new workspace immediately** and **Automatically get all revisions**.
6. Click **OK** to create and switch to the new workspace.

In the left-hand pane of P4V, select the **Workspace** tab to view your local workspace files. You can change workspaces by clicking the dropdown menu right under the **Workspace** tab header.

### Writing a .p4ignore

A `.p4ignore` file is just like a `.gitignore` file; it tells Helix Core which files in your workspace should not be versioned or uploaded to the depot. To configure a `.p4ignore`:

#### Step 1: Creating the File

1. In your workspace root, create a new text file named `.p4ignore`.
2. Open the file in a text editor.
3. Specify the paths that should be ignored, writing one entry per line, or copy one of the engine-specific templates provided below.  
Key syntax details:
    - Paths are case-sensitive.
    - A `!` can be prefixed to force-include (un-ignore) a path.
    - A `/` at the end of a path ignores an entire directory.
    - A `*` matches characters within a single directory level (does not match path separators `/` or `\`).
    - A `**` matches any characters, including directory separators, across multiple levels.
4. Save the file.

<details>
  <summary>Unreal Engine example</summary>

```text
## Universal P4IGNORE for Unreal Engine Projects
## Works with both game projects and custom engine source
## Optimized pattern usage based on Perforce P4IGNORE documentation

# The syntax for P4IGNORE files is not the same as Perforce syntax.
# Key differences from .gitignore:
# - A / at the start means "relative to this p4ignore file"
# - A / at the end means "directories only"
# - * matches substrings but NOT path separators (like P4 wildcard)
# - ** matches substrings INCLUDING path separators (like P4 "..." wildcard)
# - ! at the start excludes the file specification

###############################################################################
# Visual Studio Solution and Project Files
###############################################################################

# Ignore root Visual Studio solution files only
/*.sln
/*/*.sln

# Visual Studio temp files (but exclude when .pdb is in folder path)
.vs/
*.pdb
!*.pdb/
*.suo
*.opensdf
*.sdf
*.tmp
*.mdb
obj/
*.vcxproj

# User-specific Visual Studio files
**/launchSettings.json
*.csproj.user
*.csproj.cache
*.csproj.nuget.*
*.csproj.AssemblyReference.cache
# Note: DO NOT ignore *.csproj.props - these are shared build configuration files
!*.csproj.props

# Built binaries and temporary build files
obj/
*.csproj.AssemblyReference.cache

###############################################################################
# Git Integration (if migrating from Git)
###############################################################################

.git/
.gitignore
.gitattributes
.gitmodules
.tgitconfig

###############################################################################
# JetBrains IDEs
###############################################################################

.idea/
!.idea/runConfigurations
.gradle/

###############################################################################
# Python
###############################################################################

__pycache__/
*.pyc
*.egg-info/

###############################################################################
# Unix/Mac Specific
###############################################################################

FileOpenOrder/
*.xcworkspace/xcuserdata/
*.xcodeproj/xcuserdata/
*.xcodeproj/project.xcworkspace/xcuserdata/
.ue4dependencies
*~
.DS_Store

###############################################################################
# Unreal Engine - Core Ignores
###############################################################################

# Samples, FeaturePacks, Templates at root only
/Samples/
/*/Samples/
/FeaturePacks/
/*/FeaturePacks/
/Templates/
/*/Templates/
# Saved and Intermediate directories (generated content)
# These can be at any depth, so use **/
**/Saved/
**/Intermediate/

# Derived Data Cache - use specific patterns to avoid matching source code
**/DerivedDataCache/Boot.ddc
**/DerivedDataCache/**/*.udd
**/DerivedDataCache/
!**/Source/**/DerivedDataCache/

# Personal workspace configuration
.p4config.txt
.p4sync.txt

# Crash reports
crashinfo--*

# Linux project files
*.pro
*.pri
*.kdev4

# Obj-C/Swift specific
*.hmap
*.ipa
*.dSYM.zip
Binaries/**/*.dSYM
Binaries/**/*.dsym

# VSCode workspace files
*.code-workspace

# UGS folder (per-workspace)
.ugs/

# Local builds
/LocalBuilds/
!ArchiveForUGS-Perforce/

###############################################################################
# Engine-Specific Paths
# Use **/ prefix so these work whether Engine is at root or nested
###############################################################################

# UnrealBuildTool logs and configuration
Engine/Programs/UnrealBuildTool/*.txt
Engine/Programs/UnrealBuildTool/Log*.json
Engine/Programs/UnrealBuildTool/Log*.uba
*.uatbuildrecord

# Build receipts
Engine/Build/Receipts/

# C# program intermediates and saved folders
Engine/Source/Programs/*/obj/
Engine/Programs/*/Saved/

# build artifacts
*.deps.json
*.runtimeconfig.json
**/bin/**/ref/

# Exceptions for build artifacts
!Engine/Binaries/ThirdParty/**/*.deps.json
!Engine/Binaries/ThirdParty/**/*.runtimeconfig.json
!Engine/Binaries/DotNET/**/*.deps.json
!Engine/Binaries/DotNET/**/*.runtimeconfig.json

# Test coverage files
.msCoverageSourceRootsMapping_*
CoverletSourceRootsMapping_*

# Documentation tools output
Engine/Binaries/DotNET/UnrealBuildTool.xml
Engine/Binaries/DotNET/AutomationScripts/BuildGraph.Automation.xml

# Version files created by UBT
Engine/Binaries/**/*.version

# Export files (linker-generated, not source)
Engine/Binaries/**/*.exp

# Swarm local save files
Engine/Binaries/DotNET/SwarmAgent.DeveloperOptions.xml
Engine/Binaries/DotNET/SwarmAgent.Options.xml

# HoloLens WMRInterop autogenerated files
Engine/Source/ThirdParty/WindowsMixedRealityInterop/packages/
Engine/Source/ThirdParty/WindowsMixedRealityInterop/MixedRealityInteropHoloLens/Generated Files/
Engine/Source/ThirdParty/WindowsMixedRealityInterop/MixedRealityInteropHoloLens/x64/
Engine/Source/ThirdParty/WindowsMixedRealityInterop/MixedRealityInteropHoloLens/ARM64/
Engine/Source/ThirdParty/WindowsMixedRealityInterop/MixedRealityInterop/x64/
Engine/Source/ThirdParty/WindowsMixedRealityInterop/MixedRealityInterop/ARM64/

###############################################################################
# DCC Application Autosave and Temporary Files
# Using specific extensions and patterns to avoid catching legitimate files
###############################################################################

# Blender - specific extensions only
*.blend1
*.blend2
*.blend@
untitled.blend

# Autodesk Maya
*.ma.swatches
*.mb.swatches
*_incrementalSave_*.ma
*_incrementalSave_*.mb
incrementalSave/
scenes/edits/

# Autodesk 3ds Max
*.max.bak
autoback/
MaxStart.max

# Cinema 4D
*.c4d.zip
*.c4d~

# Houdini
*.hip.bak
*.hipnc.bak
*.hiplc.bak

# ZBrush
*.ZTL.bak
*.ZPR.bak
QuickSave*

# Substance Painter/Designer
*.spp.bak
*.sbs.bak
*.sbsar.bak

# Adobe Creative Suite - full extensions to avoid false matches
*.psd~
*.ai~
*.indd~
*.fla~
*.aep~
*.prproj~
Adobe After Effects Auto-Save/
Adobe Premiere Pro Auto-Save/
Photoshop Temp*

# Audio Applications

# Pro Tools
*.ptx~
*.ptf~
Session File Backups/

# Reaper
*.rpp-bak
*.rpp~

# Logic Pro
*.logic/Alternatives/
*.logic/Backups/

# Cubase/Nuendo
*.cpr.bak
*.npr.bak

# Ableton Live
*.als~

# FMOD
*.fspro.bak
*.fspro~

# Wwise
*.wproj.bak
*.wsettings.bak

# General DCC patterns (specific directory names only)
.mayaSwatches/

# Python Patterns
.venv/

# AI Stuff
.mcp.json
.ai/
```

</details>

<details>
  <summary>Unity Engine example</summary>

```text
# Unity Files and Folders to ignore
Library/
Temp/
Obj/
Build/
Builds/
UserSettings/
MemoryCaptures/
Logs/
Assets/AssetStoreTools/
Assets/AddressableAssetsData/*/*.bin*
Assets/StreamingAssets/aa.meta
.collabignore
# Build files to ignore
*.apk
*.unitypackage

# Gradle cache directory
.gradle

# Autogenerated project files
/Assets/Plugins/Editor/JetBrains*
.vs
ExportedObj/
.consulo
*.csproj
*.unityproj
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
*.svd
*.pdb
*.mdb
*.opendb
*.VC.db

# Unity3D generated meta files
*.pidb.meta
*.pdb.meta
*.mdb.meta
```

</details>

#### Step 2: Testing the File

Now, we need to test the file to ensure it works correctly.

1. Add a file to the workspace that should be ignored (e.g., a build artifact or temp file).
2. Find the file in the P4V workspace window and select it.
3. Click the **Add** button in the toolbar.
4. Choose **default** from the dropdown for **Add files to pending changelist:**.
5. Click **OK**.
6. Open the **View** menu and click **Pending** to open the **Pending** tab.
7. If the **default** changelist does not expand to show the ignored file, then our `.p4ignore` file is working.  
![empty changelist](../assets/P4VTutorial4.png)

#### Step 3: Submitting the File to the Server

Now, we must submit the `.p4ignore` file to the server so that all team members follow its rules.

1. In the **Workspace** tab in the left-hand panel, select the `.p4ignore` file.
2. Click the **Add** button in the toolbar.
3. Choose **default** from the dropdown for **Add files to pending changelist:**.
4. Click **OK**.
5. Open the **View** menu and click **Pending**. This time, the **default** changelist should expand to show `.p4ignore`.
6. Click the **default** changelist and click the **Submit** button in the toolbar.
7. Enter a description like "Add .p4ignore".
8. Click **Submit**.

### Adding Your Game

Now, it is finally time to add your game to the project. If you are creating a new game, simply start working in the workspace you created until you reach a point where you would normally make your initial commit. If you are importing an existing game, clone it into the workspace, but make sure to delete any files or folders that were only relevant under the previous version control system (such as `.gitignore`, `.gitattributes`, `.git/`, and `.github/`).

### Adding and Submitting Files

This is the core loop of working with P4: adding and submitting files to contribute changes, or getting the latest revision of your team's work. To add a brand-new file (or your entire game if you are porting it to P4):

1. Add the new file(s) in your workspace.
2. Open the **Workspace** tree in the left panel.
3. Select the file(s) you added and click the **Add** button in the toolbar.
4. Choose **default** from the dropdown menu for **Add files to pending changelist:**.  
*Note: A changelist in P4 is a group of new or changed files that will be submitted to the stream. Think of it like a commit in Git.*
5. Click **OK**.
6. Open the **View** menu and click **Pending**. The **default** changelist should expand to include the files you added.
7. Click the **default** changelist, and click the **Submit** button in the toolbar.
8. Enter a description of your changes.
9. Click **Submit**. If you are submitting a large project for the first time, this process may take several minutes.

### Working with Existing Versioned Files

By default, files in your workspace are marked as read-only to prevent accidental edits. To edit files in P4, you must check them out, which alerts your team that you are working on them.

1. Open the **Workspace** tree in the left panel.
2. Click **Get Latest** in the toolbar to fetch the latest changes from the server.
3. Select the files you wish to edit and click the **Checkout** button in the toolbar.
4. Choose **default** from the dropdown menu for **Add files to pending changelist:**.
5. Click **OK**.
6. When you are finished editing, open the **View** menu and click **Pending**. The **default** changelist should expand to show your edited files.
7. Select the **default** changelist and click the **Submit** button in the toolbar.
8. Enter a description of your changes.
9. Click **Submit**.

### Game Engine Integrations

Game engine integrations allow you to work with versioned files directly within your editor, removing the need to switch to P4V to check out files. While integrations exist for both Unreal and Unity, this guide covers the Unity integration. To set up the Unity integration:

1. Open your project in Unity.
2. Select **Edit** > **Project Settings**.
3. Select the **Version Control** tab on the left and set the **Mode** to **Perforce**.
4. Enter your P4 credentials, workspace name, and server address (including the leading `ssl:` and trailing `:port`, for example: `ssl:55.55.55.55:1666`).  
![unity settings](../assets/UnityTutorial1.png)
5. Now, within your Unity project, you can right-click any asset and select **Version Control** to **Check Out**, **Submit**, or **Revert** it.

### Creating User Accounts and Onboarding Your Team

Now, we need to create user accounts for our team. Since we are on the free tier, we only get five user accounts to share. To create your users' accounts:

1. Open P4V.
2. Select **Tools** > **Administration** to open P4Admin.
3. Select the **Users & Groups** tab in the right panel.
4. Click the **File** menu, then select **New** > **User...**.
5. In the dialog box, enter the user's email, username, full name, and a one-time password.

Send your team members their usernames and passwords, along with the P4 server address and port, so they can log in, change their passwords, and get started. It is highly recommended to record a video showing them how to create a workspace, add files, edit files, and submit a changelist. Additionally, consider working with them in person or over a screen-share call to help them get acclimated to P4V.

## How We Used P4

Using P4 like Git, with feature branches and multiple streams, is nearly impossible on the free tier and defeats its main advantages. We initially tried to create a new task stream for each task, but we quickly realized that the 20-workspace limit made this approach unfeasible.

We eventually settled on a very simple stream pattern: one mainline stream where the main build of the game lives, and one dev stream where everyone makes their changes. While this might sound disorganized in theory, in practice it worked remarkably well for our small-scale game. Furthermore, if a large-scale feature needs prototyping, there is still room to open a third long-term stream.

## Reflection

P4 proved to be a highly valuable tool for our team. The only significant hurdles were the initial AWS setup and onboarding. Once we were acclimated, P4 helped us maintain a smooth development pace and avoid the complex merge conflicts that had previously delayed our releases.
