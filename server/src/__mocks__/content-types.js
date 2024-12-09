const mockedContentTypes = {
  'api::blog-post.blog-post': {
    kind: 'collectionType',
    collectionName: 'blog_posts',
    info: {
      singularName: 'blog-post',
      pluralName: 'blog-posts',
      displayName: 'Blog Post'
    },
    options: {
      draftAndPublish: true
    },
    attributes: {
      title: {
        type: 'string',
        required: true
      },
      content: {
        type: 'richtext'
      },
      author: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::author.author'
      },
      publishedAt: {
        type: 'datetime'
      }
    }
  },
  'api::author.author': {
    kind: 'collectionType',
    collectionName: 'authors',
    info: {
      singularName: 'author',
      pluralName: 'authors',
      displayName: 'Author'
    },
    options: {
      draftAndPublish: true
    },
    attributes: {
      name: {
        type: 'string',
        required: true
      },
      bio: {
        type: 'text'
      },
      email: {
        type: 'email',
        required: true,
        unique: true
      },
      posts: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::blog-post.blog-post'
      }
    }
  },
  'admin::admin-user.admin-user': {
    kind: 'collectionType',
    collectionName: 'admin_users',
    info: {
      singularName: 'admin-user',
      pluralName: 'admin-users',
      displayName: 'Admin User'
    },
    options: {
      timestamps: true
    },
    attributes: {
      username: {
        type: 'string',
        required: true,
        unique: true
      },
      email: {
        type: 'email',
        required: true,
        unique: true
      },
      password: {
        type: 'password',
        required: true
      },
      role: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'admin::role'
      }
    }
  }
}

const expectedContentTypes = [
  {
    value: 'api::blog-post.blog-post',
    label: 'Blog Post',
    schema: {
      author: {
        bio: 'string',
        email: 'string',
        name: 'string'
      },
      content: 'string',
      title: 'string'
    },
    availableRelations: [
      {
        label: 'api::author.author',
        value: 'author'
      }
    ]
  },
  {
    value: 'api::author.author',
    label: 'Author',
    schema: {
      bio: 'string',
      email: 'string',
      name: 'string',
      posts: 'collection'
    },
    availableRelations: [
      {
        label: 'api::blog-post.blog-post',
        value: 'posts'
      }
    ]
  }
]

const mockedTestRecord = {
  id: 1,
  title: 'Test Entry'
}

module.exports = { mockedContentTypes, expectedContentTypes, mockedTestRecord }
