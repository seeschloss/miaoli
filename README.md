Miaoli
======
A Node.js/Redis tribune.

Structure
------
An arbitrary amount of *tribunes* can be created in one Miaoli instance.

Tribunes are identified by an `id` which is a non-zero UTF8 string of any length, excluding the following characters: `\/:?&#` as well as whitespace. These identifiers are case-sensitive (though this might change in the future). 

Tribunes are accessible at this path: `/tribune/<id>`.

API
------
The 20 latest messages of any tribune are available in XML format at this path: `/tribune/<id>/xml` or in tab-separated values format at this path: `/tribune/<id>/tsv` in the formats described below.

Messages can be POSTed over HTTP to any tribune at this path: `/tribune/<id>/post` using the `message` POST parameter, and if necessary specifying a cookie for authentication.

### XML format
```xml
<?xml version="1.0" encoding="utf-8"?>
<board site="/tribune/[id]">
  <post id="[post id]" time="[posting time]">
    <info>[user nickname]</info>
    <login>[authenticated user nickname]</login>
    <message>[message content]</message>
  </post>
</board>
```
### TSV format
```tsv
[post id]\t[posting time]\t[user nickname]\t[authenticated user nickname]\t[message content]\n
```
#### Fields
<dl>
  <dt>post id</dt>
  <dd>Identifier of the post. Post ids are numerical, strictly incrementing, with an optional string suffix, and do not necessarily increment by just one. They are usually of the form <code>14071789</code> or <code>14071789@tribuneid</code>. Post ids are the primary method for sorting posts.</dd>
  
  <dt>posting time</dt>
  <dd>Full time of the instant the post was created, in the following format: <code>YYYYMMDDhhmmss</code>. This is not necessarily UTC, this can be in any timezone, existing or not, with any arbitrary offset to UTC. Timestamps are not always increasing (they can follow DST) and several posts can be at the same time. Leap seconds can lead to timestamps ending in 60.</dd>
  
  <dt>user nickname</dt>
  <dd>Depending on the tribune settings, anonymous users can choose any arbitrary nickname which will be set here. Authenticated users might choose an arbitrary nickname as well. The value in the field is escaped using HTML entities. This field can be empty.</dd>  
  
  <dt>authenticated user nickname</dt>
  <dd>This is the fixed login name of an authenticated user. Clients are free to choose whether to display the authenticated nickname, anonymous nickname, both, or none. This field is also escaped using HTML entities.</dd>
    
  <dt>message content</dt>
  <dd>The content of the message. Messages can include a handful of HTML tags (described below) which are not escaped in this field. It is the duty of the tribune engine to make sure the XML stays valid, by stripping or entitising all other tags. The only whitespace character allowed in this field is plain ASCII space. Newlines and tabs are forbidden.</dd>
</dl>

#### Message content
Messages can contain six tags (they are HTML tags, but should be more properly considered "tribune markup language" tags, which would be a very limited subset of HTML):

* `i` Italic text
* `b` Bold text
* `u` Underlined text
* `s` Strikethrough text
* `tt` Fixed-width text
* `a` Hyperlink. Hyperlinks should contain an "href" attribute which indicates the link target.

Any other tag is strictly forbidden and should not appear in the XML. It can be stripped or escaped using HTML entities. The following entities are allowed, and should be resolved by the client when displaying the message to the user:

* `&lt;` for <code>&lt;</code>
* `&gt;` for <code>&gt;</code>
* `&amp;` for <code>&amp;</code>

All other entities are forbidden. Here is an example of how could be encoded, and then displayed, a message:

Input message:
> Hello world, can &lt;i&gt;anyone&lt;/i&gt; help me understand how the &lt;video&gt; &amp; &lt;audio&gt; tags work?

Encoded:
> `<message>Hello world, can <i>anyone</i> help me understand how the &lt;video&gt; &amp; &lt;audio&gt; tags work?</message>`

Displayed:
> Hello world, can <i>anyone</i> help me understand how the &lt;video&gt; &amp; &lt;audio&gt; tags work?


It is customary in tribunes to replace input URLs with `<a href="http://...">[url]</a>` but not mandatory.


Docker
------
[Dockerfile](//github.com/claudex/docker-miaoli) for building a Miaoli docker image.
